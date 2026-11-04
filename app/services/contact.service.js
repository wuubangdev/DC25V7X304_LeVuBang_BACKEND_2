const { ObjectId } = require("mongodb");
const ApiError = require("../api-error");

class ContactService {
    constructor(client) {
        this.Contact = client.db().collection("contacts");
    }
    extractContactData(payload) {
        const contact = {};
        for (const key of ["name", "email", "address", "phone", "favorite"]) {
            if (payload[key] === undefined) continue;
            const type = key === "favorite" ? "boolean" : "string";
            if (typeof payload[key] !== type) {
                throw new ApiError(400, `${key} must be ${type}`);
            }
            contact[key] = payload[key];
        }
        if (contact.name !== undefined) {
            contact.name = contact.name.trim();
            if (!contact.name) throw new ApiError(400, "Name can not be empty");
        }
        return contact;
    }

    async create(payload) {
        const contact = this.extractContactData(payload);
        contact.favorite = contact.favorite === true;
        const result = await this.Contact.insertOne(contact);
        return { _id: result.insertedId, ...contact };
    }

    async find(filter) {
        return await this.Contact.find(filter).toArray();
    }

    async findByName(name) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return await this.find({
            name: { $regex: escaped, $options: "i" },
        });
    }

    async findById(id) {
        if (!/^[a-fA-F0-9]{24}$/.test(id)) return null;
        return await this.Contact.findOne({ _id: new ObjectId(id) });
    }

}

module.exports = ContactService;
