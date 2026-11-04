const ContactService = require("../services/contact.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");

function service() {
    return new ContactService(MongoDB.client);
}

function fail(next, error, message) {
    return next(error instanceof ApiError ? error : new ApiError(500, message));
}

exports.create = async (req, res, next) => {
    if (typeof req.body?.name !== "string" || !req.body.name.trim()) {
        return next(new ApiError(400, "Name can not be empty"));
    }
    try {
        return res.json(await service().create(req.body));
    } catch (error) {
        return fail(next, error, "An error occurred while creating the contact");
    }
};

exports.findAll = async (req, res, next) => {
    try {
        const { name } = req.query;
        const documents = name ? await service().findByName(name) : await service().find({});
        return res.json(documents);
    } catch (error) {
        return fail(next, error, "An error occurred while retrieving contacts");
    }
};

exports.findOne = async (req, res, next) => {
    try {
        const document = await service().findById(req.params.id);
        if (!document) return next(new ApiError(404, "Contact not found"));
        return res.json(document);
    } catch (error) {
        return fail(next, error, "Error retrieving contact");
    }
};

exports.update = (req, res) => {
    res.json({ message: "update handler" });
};

exports.delete = (req, res) => {
    res.json({ message: "delete handler" });
};

exports.deleteAll = (req, res) => {
    res.json({ message: "deleteAll handler" });
};

exports.findAllFavorite = (req, res) => {
    res.json({ message: "findAllFavorite handler" });
};
