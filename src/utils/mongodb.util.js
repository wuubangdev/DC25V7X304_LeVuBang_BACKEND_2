const { MongoClient } = require("mongodb");

class MongoDB {
    static async connect(uri) {
        if (this.client) return this.client;
        const client = new MongoClient(uri);
        await client.connect();
        this.client = client;
        return this.client;
    }
}

module.exports = MongoDB;
