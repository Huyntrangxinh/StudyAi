// Helper function to award XP for different activities
export const awardXP = async (userId: string, activityType: string, xpAmount: number): Promise<void> => {
    if (!userId) {
        console.warn('⚠️ Cannot award XP: userId is missing');
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/xp/award', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                activityType,
                xpAmount
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ XP awarded for ${activityType}:`, data);
        } else {
            const error = await response.json();
            console.warn(`⚠️ Failed to award XP for ${activityType}:`, error);
        }
    } catch (error) {
        console.error(`❌ Error awarding XP for ${activityType}:`, error);
    }
};

