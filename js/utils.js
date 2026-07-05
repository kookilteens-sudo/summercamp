const Utils = {
    generateId: () => 'card-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    calculateDday: (targetDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) return `D-${diffDays}`;
        if (diffDays === 0) return `오늘 시작!`;
        if (diffDays < 0) return `행사 종료`;
        return "";
    }
};