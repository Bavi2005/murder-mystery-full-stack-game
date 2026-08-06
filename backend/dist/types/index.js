"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchType = exports.InteractionType = exports.PlayerAction = exports.GamePhase = exports.NotificationType = exports.MessageType = exports.SabotageStatus = exports.SabotageType = exports.RoomType = exports.ClueType = exports.ItemType = exports.PlayerRole = exports.RoundStatus = exports.GameStatus = exports.GameDifficulty = exports.GameMap = exports.FriendRequestStatus = void 0;
var FriendRequestStatus;
(function (FriendRequestStatus) {
    FriendRequestStatus["PENDING"] = "PENDING";
    FriendRequestStatus["ACCEPTED"] = "ACCEPTED";
    FriendRequestStatus["REJECTED"] = "REJECTED";
    FriendRequestStatus["BLOCKED"] = "BLOCKED";
})(FriendRequestStatus || (exports.FriendRequestStatus = FriendRequestStatus = {}));
var GameMap;
(function (GameMap) {
    GameMap["MANSION"] = "MANSION";
    GameMap["MANOR"] = "MANOR";
    GameMap["CASTLE"] = "CASTLE";
    GameMap["HOTEL"] = "HOTEL";
    GameMap["MUSEUM"] = "MUSEUM";
})(GameMap || (exports.GameMap = GameMap = {}));
var GameDifficulty;
(function (GameDifficulty) {
    GameDifficulty["EASY"] = "EASY";
    GameDifficulty["NORMAL"] = "NORMAL";
    GameDifficulty["HARD"] = "HARD";
    GameDifficulty["EXPERT"] = "EXPERT";
})(GameDifficulty || (exports.GameDifficulty = GameDifficulty = {}));
var GameStatus;
(function (GameStatus) {
    GameStatus["WAITING"] = "WAITING";
    GameStatus["STARTING"] = "STARTING";
    GameStatus["IN_PROGRESS"] = "IN_PROGRESS";
    GameStatus["ROUND_END"] = "ROUND_END";
    GameStatus["FINISHED"] = "FINISHED";
    GameStatus["CANCELLED"] = "CANCELLED";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
var RoundStatus;
(function (RoundStatus) {
    RoundStatus["ACTIVE"] = "ACTIVE";
    RoundStatus["VOTING"] = "VOTING";
    RoundStatus["RESOLVED"] = "RESOLVED";
    RoundStatus["ENDED"] = "ENDED";
})(RoundStatus || (exports.RoundStatus = RoundStatus = {}));
var PlayerRole;
(function (PlayerRole) {
    PlayerRole["INNOCENT"] = "INNOCENT";
    PlayerRole["MURDERER"] = "MURDERER";
    PlayerRole["DETECTIVE"] = "DETECTIVE";
})(PlayerRole || (exports.PlayerRole = PlayerRole = {}));
var ItemType;
(function (ItemType) {
    ItemType["KEY"] = "KEY";
    ItemType["FLASHLIGHT"] = "FLASHLIGHT";
    ItemType["CAMERA"] = "CAMERA";
    ItemType["NOTE"] = "NOTE";
    ItemType["EVIDENCE_BAG"] = "EVIDENCE_BAG";
    ItemType["LOCKPICK"] = "LOCKPICK";
    ItemType["RADIO"] = "RADIO";
    ItemType["MEDKIT"] = "MEDKIT";
})(ItemType || (exports.ItemType = ItemType = {}));
var ClueType;
(function (ClueType) {
    ClueType["PHYSICAL"] = "PHYSICAL";
    ClueType["TESTIMONY"] = "TESTIMONY";
    ClueType["DIGITAL"] = "DIGITAL";
    ClueType["ENVIRONMENTAL"] = "ENVIRONMENTAL";
    ClueType["RED_HERRING"] = "RED_HERRING";
})(ClueType || (exports.ClueType = ClueType = {}));
var RoomType;
(function (RoomType) {
    RoomType["HALLWAY"] = "HALLWAY";
    RoomType["BEDROOM"] = "BEDROOM";
    RoomType["KITCHEN"] = "KITCHEN";
    RoomType["LIBRARY"] = "LIBRARY";
    RoomType["STUDY"] = "STUDY";
    RoomType["BALLROOM"] = "BALLROOM";
    RoomType["GARDEN"] = "GARDEN";
    RoomType["BASEMENT"] = "BASEMENT";
    RoomType["ATTIC"] = "ATTIC";
    RoomType["SECRET"] = "SECRET";
})(RoomType || (exports.RoomType = RoomType = {}));
var SabotageType;
(function (SabotageType) {
    SabotageType["LIGHTS_OUT"] = "LIGHTS_OUT";
    SabotageType["FAKE_EVIDENCE"] = "FAKE_EVIDENCE";
    SabotageType["FRAME_PLAYER"] = "FRAME_PLAYER";
    SabotageType["ERASE_FINGERPRINTS"] = "ERASE_FINGERPRINTS";
    SabotageType["DISABLE_CAMERAS"] = "DISABLE_CAMERAS";
    SabotageType["LOCK_DOORS"] = "LOCK_DOORS";
    SabotageType["FALSE_ALARM"] = "FALSE_ALARM";
})(SabotageType || (exports.SabotageType = SabotageType = {}));
var SabotageStatus;
(function (SabotageStatus) {
    SabotageStatus["PENDING"] = "PENDING";
    SabotageStatus["ACTIVE"] = "ACTIVE";
    SabotageStatus["COMPLETED"] = "COMPLETED";
    SabotageStatus["FAILED"] = "FAILED";
    SabotageStatus["EXPIRED"] = "EXPIRED";
})(SabotageStatus || (exports.SabotageStatus = SabotageStatus = {}));
var MessageType;
(function (MessageType) {
    MessageType["CHAT"] = "CHAT";
    MessageType["SYSTEM"] = "SYSTEM";
    MessageType["GAME_EVENT"] = "GAME_EVENT";
    MessageType["PRIVATE"] = "PRIVATE";
    MessageType["ANNOUNCEMENT"] = "ANNOUNCEMENT";
})(MessageType || (exports.MessageType = MessageType = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["FRIEND_REQUEST"] = "FRIEND_REQUEST";
    NotificationType["FRIEND_ACCEPTED"] = "FRIEND_ACCEPTED";
    NotificationType["GAME_INVITE"] = "GAME_INVITE";
    NotificationType["GAME_STARTING"] = "GAME_STARTING";
    NotificationType["YOUR_TURN"] = "YOUR_TURN";
    NotificationType["GAME_ENDED"] = "GAME_ENDED";
    NotificationType["ACHIEVEMENT"] = "ACHIEVEMENT";
    NotificationType["SYSTEM"] = "SYSTEM";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var GamePhase;
(function (GamePhase) {
    GamePhase["WAITING"] = "WAITING";
    GamePhase["ROLE_ASSIGNMENT"] = "ROLE_ASSIGNMENT";
    GamePhase["EXPLORATION"] = "EXPLORATION";
    GamePhase["VOTING"] = "VOTING";
    GamePhase["ROUND_RESOLUTION"] = "ROUND_RESOLUTION";
    GamePhase["GAME_OVER"] = "GAME_OVER";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
var PlayerAction;
(function (PlayerAction) {
    PlayerAction["MOVE"] = "MOVE";
    PlayerAction["SEARCH"] = "SEARCH";
    PlayerAction["INTERACT"] = "INTERACT";
    PlayerAction["USE_ITEM"] = "USE_ITEM";
    PlayerAction["SABOTAGE"] = "SABOTAGE";
    PlayerAction["VOTE"] = "VOTE";
    PlayerAction["CHAT"] = "CHAT";
})(PlayerAction || (exports.PlayerAction = PlayerAction = {}));
var InteractionType;
(function (InteractionType) {
    InteractionType["TALK"] = "TALK";
    InteractionType["TRADE"] = "TRADE";
    InteractionType["INSPECT"] = "INSPECT";
    InteractionType["UNLOCK"] = "UNLOCK";
    InteractionType["DISABLE"] = "DISABLE";
    InteractionType["REPAIR"] = "REPAIR";
})(InteractionType || (exports.InteractionType = InteractionType = {}));
var SearchType;
(function (SearchType) {
    SearchType["QUICK"] = "QUICK";
    SearchType["THOROUGH"] = "THOROUGH";
    SearchType["CAMERA_CHECK"] = "CAMERA_CHECK";
    SearchType["FINGERPRINT"] = "FINGERPRINT";
})(SearchType || (exports.SearchType = SearchType = {}));
//# sourceMappingURL=index.js.map