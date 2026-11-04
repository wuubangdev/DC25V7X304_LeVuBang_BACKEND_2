const { ObjectId } = require("mongodb");
const ApiError = require("../api-error");

class ContactService {
    constructor(client) {
        this.Contact = client.db().collection("contacts");
    }
}

module.exports = ContactService;
