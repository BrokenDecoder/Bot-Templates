module.exports = (userId, commandName, cooldownsCollection) => {
    const now = Date.now();
    const cooldownAmount = 3 * 1000; // 3 seconds default cooldown

    // Ensure the collection has a map for this command
    if (!cooldownsCollection.has(commandName)) {
        cooldownsCollection.set(commandName, new Map());
    }

    const timestamps = cooldownsCollection.get(commandName);

    if (timestamps.has(userId)) {
        const expirationTime = timestamps.get(userId) + cooldownAmount;

        if (now < expirationTime) {
            return true; // Rate limited
        }
    }

    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownAmount);

    return false; // Not rate limited
};
