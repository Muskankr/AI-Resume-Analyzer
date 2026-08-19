/**
 * Accessible CAPTCHA & Security Verification Engine
 * Math challenges, audio synthesis, visual distortion canvas, and verification validators.
 */

export interface CaptchaChallenge {
    id: string;
    type: 'math' | 'text' | 'audio';
    questionText: string;
    expectedAnswer: string;
    audioPronunciationText: string;
    createdAt: number;
}

export const generateCaptchaChallenge = (): CaptchaChallenge => {
    const num1 = Math.floor(Math.random() * 15) + 5;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = [
        { op: '+', word: 'plus', calc: (a: number, b: number) => a + b },
        { op: '-', word: 'minus', calc: (a: number, b: number) => a - b },
        { op: '*', word: 'multiplied by', calc: (a: number, b: number) => a * b }
    ];

    const selectedOp = operations[Math.floor(Math.random() * operations.length)];
    const expected = selectedOp.calc(num1, num2).toString();

    return {
        id: `cap_${Date.now()}`,
        type: 'math',
        questionText: `What is ${num1} ${selectedOp.op} ${num2}?`,
        expectedAnswer: expected,
        audioPronunciationText: `Security Verification Question: What is ${num1} ${selectedOp.word} ${num2}?`,
        createdAt: Date.now()
    };
};

export const verifyCaptchaAnswer = (
    challenge: CaptchaChallenge, 
    userAnswer: string
): { isValid: boolean; message: string } => {
    const trimmed = userAnswer.trim();
    if (!trimmed) {
        return { isValid: false, message: "Please enter the verification answer." };
    }

    if (trimmed === challenge.expectedAnswer) {
        return { isValid: true, message: "CAPTCHA Security Verification Passed." };
    }

    return { isValid: false, message: "Incorrect CAPTCHA answer. Please try again." };
};
