const ContactService = require("../services/contact.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");

function service() {
    return new ContactService(MongoDB.client);
}

function fail(next, error, message) {
    return next(error instanceof ApiError ? error : new ApiError(500, message));
}

exports.create = (req, res) => {
    res.json({ message: "create handler" });
};

exports.findAll = (req, res) => {
    res.json({ message: "findAll handler" });
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
