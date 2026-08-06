"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderboard = exports.getGameStats = exports.searchUsers = exports.markAllNotificationsRead = exports.markNotificationRead = exports.getNotifications = exports.getFriends = exports.removeFriend = exports.rejectFriendRequest = exports.acceptFriendRequest = exports.sendFriendRequest = exports.updateProfile = exports.getProfile = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const user_service_1 = require("../services/user.service");
exports.getProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const profile = await user_service_1.UserService.getProfile(req.user.userId);
    res.json({ success: true, data: profile });
});
exports.updateProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = req.body;
    const profile = await user_service_1.UserService.updateProfile(req.user.userId, data);
    res.json({ success: true, data: profile });
});
exports.sendFriendRequest = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { receiverId } = req.body;
    const request = await user_service_1.UserService.sendFriendRequest(req.user.userId, receiverId);
    res.status(201).json({ success: true, data: request });
});
exports.acceptFriendRequest = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { requestId } = req.params;
    const result = await user_service_1.UserService.acceptFriendRequest(req.user.userId, requestId);
    res.json({ success: true, data: result });
});
exports.rejectFriendRequest = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { requestId } = req.params;
    const result = await user_service_1.UserService.rejectFriendRequest(req.user.userId, requestId);
    res.json({ success: true, data: result });
});
exports.removeFriend = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { friendId } = req.params;
    const result = await user_service_1.UserService.removeFriend(req.user.userId, friendId);
    res.json({ success: true, data: result });
});
exports.getFriends = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const friends = await user_service_1.UserService.getFriends(req.user.userId);
    res.json({ success: true, data: friends });
});
exports.getNotifications = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await user_service_1.UserService.getNotifications(req.user.userId, unreadOnly);
    res.json({ success: true, data: notifications });
});
exports.markNotificationRead = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { notificationId } = req.params;
    await user_service_1.UserService.markNotificationRead(req.user.userId, notificationId);
    res.json({ success: true, data: { message: 'Marked as read' } });
});
exports.markAllNotificationsRead = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await user_service_1.UserService.markAllNotificationsRead(req.user.userId);
    res.json({ success: true, data: { message: 'All marked as read' } });
});
exports.searchUsers = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const query = req.query.q || '';
    const users = await user_service_1.UserService.searchUsers(query, req.user.userId);
    res.json({ success: true, data: users });
});
exports.getGameStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const stats = await user_service_1.UserService.getGameStats(req.user.userId);
    res.json({ success: true, data: stats });
});
exports.getLeaderboard = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const leaderboard = await user_service_1.UserService.getLeaderboard(limit);
    res.json({ success: true, data: leaderboard });
});
//# sourceMappingURL=user.controller.js.map