const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const app = require("../src/app");

const run = promisify(execFile);
let server;
let baseUrl;

async function request(method, route, body) {
    const args = [
        "-sS",
        "--max-time",
        "10",
        "-X",
        method,
        "-w",
        "\n%{http_code}",
        baseUrl + route,
    ];
    if (body !== undefined) {
        args.push(
            "-H",
            "Content-Type: application/json",
            "--data-binary",
            typeof body === "string" ? body : JSON.stringify(body),
        );
    }
    const executable = process.platform === "win32" ? "curl.exe" : "curl";
    const { stdout } = await run(executable, args, { windowsHide: true });
    const split = stdout.lastIndexOf("\n");
    return {
        status: Number(stdout.slice(split + 1)),
        body: JSON.parse(stdout.slice(0, split)),
    };
}

async function listen() {
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
}

const { MongoClient } = require("mongodb");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const MongoDB = require("../src/utils/mongodb.util");
const config = require("../src/config");
const databaseName = `contactbook_test_${process.pid}_${Date.now()}`;
let client;

function fixture(name) {
    return JSON.parse(
        readFileSync(path.join(__dirname, "fixtures", name), "utf8"),
    );
}

before(async () => {
    client = new MongoClient(config.db.uri, {
        dbName: databaseName,
        serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    MongoDB.client = client;
    await listen();
});

after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (client) {
        try {
            await client.db(databaseName).dropDatabase();
        } finally {
            await client.close();
            MongoDB.client = undefined;
        }
    }
});

test("Contact API", async (t) => {
    let favorite;
    let normal;
    await t.test("unknown URL returns 404", async () => {
        const result = await request("GET", "/not-defined");
        assert.equal(result.status, 404);
        assert.equal(result.body.message, "Resource not found");
    });
    for (const [name, data] of [
        ["missing name", fixture("invalid.json")],
        ["blank name", { name: "   " }],
        ["invalid favorite type", { name: "Bang", favorite: "true" }],
        ["invalid email type", { name: "Bang", email: 123 }],
        ["malformed JSON", "{"],
    ]) {
        await t.test(`${name} returns 400`, async () => {
            assert.equal(
                (await request("POST", "/api/contacts", data)).status,
                400,
            );
        });
    }
    await t.test(
        "POST creates a favorite and ignores unsupported fields",
        async () => {
            const result = await request("POST", "/api/contacts", {
                ...fixture("contact.json"),
                unsupported: "ignore",
            });
            assert.equal(result.status, 200);
            assert.match(result.body._id, /^[a-f0-9]{24}$/);
            assert.equal(result.body.favorite, true);
            assert.equal(result.body.unsupported, undefined);
            favorite = result.body;
        },
    );
    await t.test("POST defaults favorite to false and trims name", async () => {
        const result = await request("POST", "/api/contacts", {
            name: "  Tran Thi An  ",
        });
        assert.equal(result.status, 200);
        assert.equal(result.body.favorite, false);
        assert.equal(result.body.name, "Tran Thi An");
        normal = result.body;
    });
    await t.test("GET lists both contacts", async () => {
        assert.equal((await request("GET", "/api/contacts")).body.length, 2);
    });
    await t.test("name search ignores letter case", async () => {
        const result = await request("GET", "/api/contacts?name=bAnG");
        assert.equal(result.status, 200);
        assert.deepEqual(
            result.body.map((item) => item._id),
            [favorite._id],
        );
    });
    await t.test("regular expression characters are literal", async () => {
        const result = await request("GET", "/api/contacts?name=%5B");
        assert.equal(result.status, 200);
        assert.deepEqual(result.body, []);
    });
    for (const query of ["name=a&name=b", "name%5Ba%5D=b"]) {
        await t.test(`non-string query ${query} returns 400`, async () => {
            assert.equal(
                (await request("GET", `/api/contacts?${query}`)).status,
                400,
            );
        });
    }
    await t.test("favorite route excludes normal contacts", async () => {
        const result = await request("GET", "/api/contacts/favorite");
        assert.equal(result.status, 200);
        assert.deepEqual(
            result.body.map((item) => item._id),
            [favorite._id],
        );
    });
    await t.test("GET retrieves the real ObjectId", async () => {
        assert.deepEqual(
            (await request("GET", `/api/contacts/${favorite._id}`)).body,
            favorite,
        );
    });
    await t.test(
        "MongoDB stores data across independent connections",
        async () => {
            const other = new MongoClient(config.db.uri, {
                dbName: databaseName,
            });
            try {
                await other.connect();
                assert.equal(
                    await other.db().collection("contacts").countDocuments(),
                    2,
                );
            } finally {
                await other.close();
            }
        },
    );
    await t.test("PUT updates only submitted fields", async () => {
        const update = fixture("update.json");
        assert.equal(
            (await request("PUT", `/api/contacts/${favorite._id}`, update))
                .status,
            200,
        );
        const result = await request("GET", `/api/contacts/${favorite._id}`);
        for (const [key, value] of Object.entries(update))
            assert.equal(result.body[key], value);
        assert.equal(result.body.email, favorite.email);
    });
    for (const data of [
        {},
        { unexpected: true },
        { name: " " },
        { favorite: 1 },
    ]) {
        await t.test(
            `invalid PUT ${JSON.stringify(data)} returns 400`,
            async () => {
                assert.equal(
                    (
                        await request(
                            "PUT",
                            `/api/contacts/${favorite._id}`,
                            data,
                        )
                    ).status,
                    400,
                );
            },
        );
    }
    for (const id of ["invalid-id", "000000000000000000000000"]) {
        await t.test(`unknown ID ${id} returns 404`, async () => {
            for (const method of ["GET", "PUT", "DELETE"]) {
                const body = method === "PUT" ? { name: "Missing" } : undefined;
                assert.equal(
                    (await request(method, `/api/contacts/${id}`, body)).status,
                    404,
                );
            }
        });
    }
    await t.test("DELETE removes a contact once", async () => {
        assert.equal(
            (await request("DELETE", `/api/contacts/${favorite._id}`)).status,
            200,
        );
        assert.equal(
            (await request("GET", `/api/contacts/${favorite._id}`)).status,
            404,
        );
        assert.equal(
            (await request("DELETE", `/api/contacts/${favorite._id}`)).status,
            404,
        );
    });
    await t.test("DELETE all returns the number actually deleted", async () => {
        assert.equal(
            (await request("GET", `/api/contacts/${normal._id}`)).status,
            200,
        );
        const result = await request("DELETE", "/api/contacts");
        assert.equal(result.status, 200);
        assert.equal(
            result.body.message,
            "1 contacts were deleted successfully",
        );
        assert.deepEqual((await request("GET", "/api/contacts")).body, []);
    });
});
