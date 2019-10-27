const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

exports.getOne = (Model, populateObj, sort) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (sort) query = query.sort({ [sort]: -1 });
    if (populateObj) query = query.populate(populateObj);
    const doc = await query;
    if (!doc) return next(new AppError("No doc is found with that ID!", 404));
    if (req.user) {
      if (doc.userIdsLiked && doc.userIdsLiked.userId.includes(req.user._id))
        doc.userLiked = true;
      if (doc.posts) {
        doc.posts.forEach(data => {
          if (
            req.user &&
            data.userIdsLiked.some(userData => userData.userId == req.user.id)
          )
            data.userLiked = true;
        });
      }
    }

    res.status(200).json({
      status: "success",
      data: {
        data: doc
      }
    });
  });

exports.getAll = (Model, populateObj, sort) =>
  catchAsync(async (req, res, next) => {
    let filter = {};
    if (req.query.search)
      filter = {
        $text: {
          $search: req.query.search,
          $language: "en",
          $caseSensitive: false
        }
      };
    if (req.body.postId) filter = { postId: req.body.postId };
    let query = Model.find(filter);
    if (sort) query = query.sort({ [sort]: -1 });
    if (populateObj) query = query.populate(populateObj);

    const doc = await query;
    doc.forEach(data => {
      if (
        req.user &&
        data.userIdsLiked.some(userData => userData.userId == req.user.id)
      )
        data.userLiked = true;
    });

    res.status(200).json({
      status: "success",
      results: doc.length,
      data: {
        data: doc
      }
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    req.body.createdAt = new Date(Date.now());
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: "success",
      data: {
        data: doc
      }
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    for (let key in req.body) {
      if (!req.body[key]) delete req.body[key];
      if (key === "password") delete req.body[key];
    }
    if (req.query.like) {
      delete req.body.user;
      if (req.query.like === "false")
        req.body.$push = {
          userIdsLiked: { userId: req.user._id, name: req.user.firstName }
        };
      if (req.query.like === "true")
        req.body.$pull = {
          userIdsLiked: { userId: req.user._id, name: req.user.firstName }
        };
    }

    if (req.query.competitor)
      req.body.$push = { competitors: req.query.competitor };

    if (req.body.skills) {
      req.body.skills = req.body.skills.split(",").map(skill => {
        skill = skill.trim().split(" ");
        return {
          skillName: skill[0],
          rating: skill[1]
        };
      });
    }
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) return next(new AppError("No doc is found with that ID!", 404));

    res.status(200).json({
      status: "success",
      data: {
        data: doc
      }
    });
  });

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) return next(new AppError("No doc is found with that ID!", 404));

    res.status(204).json({
      status: "success",
      data: {
        data: null
      }
    });
  });
