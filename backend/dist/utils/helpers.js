"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInRange = exports.calculateDistance = exports.pickRandom = exports.shuffleArray = exports.chunkArray = exports.retry = exports.sleep = exports.parseDuration = exports.formatDate = exports.truncate = exports.slugify = exports.generateNumericCode = exports.generateToken = void 0;
const generateToken = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
exports.generateToken = generateToken;
const generateNumericCode = (length = 6) => {
    return Math.floor(10 ** (length - 1) + Math.random() * 9 * 10 ** (length - 1)).toString();
};
exports.generateNumericCode = generateNumericCode;
const slugify = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
exports.slugify = slugify;
const truncate = (text, length) => {
    if (text.length <= length)
        return text;
    return text.slice(0, length - 3) + '...';
};
exports.truncate = truncate;
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
};
exports.formatDate = formatDate;
const parseDuration = (duration) => {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match)
        return 0;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 0;
    }
};
exports.parseDuration = parseDuration;
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
const retry = async (fn, retries = 3, delay = 1000) => {
    try {
        return await fn();
    }
    catch (error) {
        if (retries <= 0)
            throw error;
        await (0, exports.sleep)(delay);
        return (0, exports.retry)(fn, retries - 1, delay * 2);
    }
};
exports.retry = retry;
const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};
exports.chunkArray = chunkArray;
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
exports.shuffleArray = shuffleArray;
const pickRandom = (array, count) => {
    const shuffled = (0, exports.shuffleArray)(array);
    return shuffled.slice(0, count);
};
exports.pickRandom = pickRandom;
const calculateDistance = (pos1, pos2) => {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
};
exports.calculateDistance = calculateDistance;
const isInRange = (pos1, pos2, range) => {
    return (0, exports.calculateDistance)(pos1, pos2) <= range;
};
exports.isInRange = isInRange;
//# sourceMappingURL=helpers.js.map