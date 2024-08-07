import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { AsyncHandler } from "../utils/AsyncHandler.js"

export const getVideoComments = AsyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if(!videoId) throw new ApiError(400, "videoId not found")
    const video = await Video.findById(videoId)

    if(!video) throw new ApiError(404, "video not found")

    const options = {
        page,
        limit
    }

    const videoList = await Comment.aggregate([
        {
          '$match': {
            'video': new mongoose.Types.ObjectId(videoId)
          }
        }
    ])

    Comment.aggregatePaginate(videoList, options, function(err, results) {
        if(err) {
            throw new ApiError(500, "Error in aggregate paginate", err)
        }else {
            return res
            .status(200)
            .json(
                new ApiResponse(200, "Success", results)
            )
        }
    })
})

export const addComment = AsyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { comment } = req.body;

    if(!videoId) throw new ApiError(400, "No Video ID provided")
    if(!comment) throw new ApiError(400, "comment not Provided from the user")
    
    const video = await Video.findById(videoId);
    if(!video) throw new ApiError(400, "Video not Found")

    const user = req.user._id;
    if(!user) throw new ApiError(400, "User not Authenticated")

    const newComment = await Comment.create({
        content: comment,
        video: new mongoose.Types.ObjectId(videoId),
        owner: new mongoose.Types.ObjectId(user)
    })

    if(!newComment) throw new ApiError(500, "Unable to create Comment")

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Comment Added", newComment)
    )
})

export const updateComment = AsyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { comment } = req.body;

    const originalComment = await Comment.findById(commentId);
    if(!originalComment) throw new ApiError(404, "Comment not found");

    if(!comment) throw new ApiError(404, "new commwnt not recieved");

    const user = req.user._id;
    if(!user) throw new ApiError(400, "User not Authenticated")

    if(!user.equals(originalComment.owner)) throw new ApiError(400, "User not Authorised to edit the comment");

    originalComment.content = comment;
    await originalComment.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, "comment updated successfully", originalComment)
        )

})

export const deleteComment = AsyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if(!commentId) throw new ApiError(404, "Comment ID not recieved");

    const comment = await Comment.findById(commentId);
    if(!comment) throw new ApiError(400, "invalind comment Id");

    const userId = req.user._id;
    if(!userId) throw new ApiError(400, "User not Authenticated")

    if(!userId.equals(comment.owner)) throw new ApiError(400, "User not Authorised to delete the comment");

    const deletedComment = await Comment.findByIdAndDelete(commentId);
    if(!deletedComment) throw new ApiError(500, "Unable to delete the comment");

    return res
        .status(200)
        .json(
            new ApiResponse(200, "Comment deleted successfully", deletedComment)
        )

})