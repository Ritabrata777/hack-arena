const { spawn } = require('child_process');
const path = require('path');

// Determine Python executable (might need configuration in prod)
// Check for explicit path in env, or fallback to 'python'/'python3'
const PYTHON_CMD = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');

/**
 * Runs the training script.
 * @returns {Promise<string>} Output of the training script.
 */
export async function runTraining() {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'src', 'ml_service', 'train_model.py');
        const child = spawn(PYTHON_CMD, [scriptPath]);

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            if (code !== 0) {
                const missingModule = errorOutput.match(/ModuleNotFoundError: No module named ['"]([^'"]+)['"]/);
                if (missingModule) {
                    reject(new Error(
                        `Python dependency "${missingModule[1]}" is missing. Run: ${PYTHON_CMD} -m pip install -r src/ml_service/requirements.txt`
                    ));
                    return;
                }
                reject(new Error(`Training failed with code ${code}: ${errorOutput || output}`));
            } else {
                resolve(output);
            }
        });

        child.on('error', (err) => {
            reject(new Error(`Failed to start python process: ${err.message}. Is Python installed?`));
        });
    });
}

/**
 * Predicts fraud risk (0-100) for a campaign.
 * @param {Object} campaignData - { goalAmount, title, description, ... }
 * @returns {Promise<Object>} { risk_score: number, prediction: string, error?: string }
 */
export async function predictFraudScore(campaignData) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'src', 'ml_service', 'predict.py');
        const inputJson = JSON.stringify(campaignData);

        const child = spawn(PYTHON_CMD, [scriptPath, inputJson]);

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            if (code !== 0) {
                console.error("Prediction script error:", errorOutput);
                // Fallback if prediction fails (e.g. model not found)
                resolve({ risk_score: 0, error: "Prediction failed or model missing" });
            } else {
                try {
                    const result = JSON.parse(output.trim());
                    resolve(result);
                } catch (e) {
                    resolve({ risk_score: 0, error: "Invalid JSON output from model" });
                }
            }
        });

        child.on('error', (err) => {
            console.error("Python spawn error:", err);
            resolve({ risk_score: 0, error: "Python runtime missing" });
        });
    });
}
