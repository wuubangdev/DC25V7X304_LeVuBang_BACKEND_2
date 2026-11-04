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

exports.update = async (req, res, next) => {
    if (!req.body || !Object.keys(req.body).length) {
        return next(new ApiError(400, "Data to update can not be empty"));
    }
    try {
        const document = await service().update(req.params.id, req.body);
        if (!document) return next(new ApiError(404, "Contact not found"));
        return res.json({ message: "Contact was updated successfully" });
    } catch (error) {
        return fail(next, error, "Error updating contact");
    }
};

exports.delete = async (req, res, next) => {
    try {
        const document = await service().delete(req.params.id);
        if (!document) return next(new ApiError(404, "Contact not found"));
        return res.json({ message: "Contact was deleted successfully" });
    } catch (error) {
        return fail(next, error, "Could not delete contact");
    }
};

exports.deleteAll = async (req, res, next) => {
    try {
        const deletedCount = await service().deleteAll();
        return res.json({ message: `${deletedCount} contacts were deleted successfully` });
    } catch (error) {
        return fail(next, error, "An error occurred while removing all contacts");
    }
};

exports.findAllFavorite = async (req, res, next) => {
    try {
        return res.json(await service().findFavorite());
    } catch (error) {
        return fail(next, error, "An error occurred while retrieving favorite contacts");
    }
};
