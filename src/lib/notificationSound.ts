// Notification sound generator using Web Audio API
// This creates a pleasant notification sound without needing external files

export const playNotificationSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Create oscillators for a pleasant "ding" sound
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Configure first oscillator (main tone)
        oscillator1.type = 'sine';
        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);

        // Configure second oscillator (harmony)
        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.1);

        // Configure gain (volume envelope)
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        // Connect nodes
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Play sound
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.3);
        oscillator2.stop(audioContext.currentTime + 0.3);

    } catch (error) {
        console.log('Audio playback not supported:', error);
    }
};
