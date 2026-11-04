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

}

module.exports = ContactService;
