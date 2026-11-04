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

exports.findOne = (req, res) => {
    res.json({ message: "findOne handler" });
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
