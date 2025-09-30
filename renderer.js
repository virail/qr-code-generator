const information = document.getElementById('info');
information.innerText = `This app is using Chrome (v${versions.chrome()}), Node.js (v${versions.node()}), and Electron (v${versions.electron()})`;

const qrSubmit = document.getElementById('qr-submit');

const qrInput = document.getElementById('qr-input');

const handleSubmit = async () => {
    console.log("We have submitted something");
    const input = qrInput.value;
    console.log(`INPUT: ${input}`);
    let total = "";
    const modeIndicator = "0100";
    let charCount = parseInt(input.length).toString(2);
    charCount = charCount.padStart(8, '0');
    console.log(charCount);

    let inputData = "";

    for (let char of input) {
        console.log(char);
        inputData += char.charCodeAt(0).toString(2).padStart(8, '0');
    }

    console.log(`InputData: ${inputData}`);

    const terminator = "0000";

    total = modeIndicator
        + charCount
        + inputData;

    let bitsRemaining = 19 * 8 - total.length;
    console.log(`bitsRemaining: ${bitsRemaining}`);
    if (bitsRemaining <= 4) {
        total += '0'.repeat(bitsRemaining);
    }
    else {
        total += terminator;

        let n = total.length;
        let alt = false;
        while (n < 19 * 8) {
            total += alt ? "11101100" : "00010001";
            alt = !alt;
            n = total.length;
        }

    }

    console.log(total);
    console.log(total.length);

    // Splitting data into 19 bytes
    let splitArray = total.match(/([0-1]{8})/g);
    splitArray = splitArray.map((val) => parseInt(val, 2));
    console.log("splitArray",splitArray);

    const { gfExp, gfLog } = generateGFTables();
    console.log(gfExp);
    console.log(gfLog);

    console.log(`Test: gfMultiply(2,5, gfExp, gfLog): ${gfMultiply(3,7,gfExp,gfLog)}`);

    console.log(generateErrorCorrection(splitArray, gfExp, gfLog));

    
    let matrix = createMatrix();

    matrix = placeData(matrix,splitArray);
    // await placeDataAnimated(matrix, splitArray, renderQRCode);

    let bestMask = null;
    let lowestPenalty = Infinity;
    for (let i = 0; i < 8; i++) {
        const maskedMatrix = applyMask(matrix, i);
        const total = penalty(maskedMatrix);

        console.log(`Mask ${i}: ${total}`);

        if (total < lowestPenalty) {
            lowestPenalty = total;
            bestMask = i;
        }
    }

    console.log(`Best mask: ${bestMask} with penalty ${lowestPenalty}`);

    renderQRCode(applyMask(matrix, bestMask));

    // L level
    const errorCorrectionBits = '01';
    const maskBits = bestMask.toString(2).padStart(3, '0');
    const formatData = errorCorrectionBits + maskBits;

    const formatCorrection = generateFormatErrorCorrection(formatData);
    const fullFormat = formatData + formatCorrection;

    const maskPattern = '101010000010010';
    let finalFormat = '';
    for (let i = 0; i < 15; i++) {
        finalFormat += fullFormat[i] === maskPattern[i] ? '0' : '1';
    }

    console.log(`finalFormat: ${finalFormat}`);

    for (let i = 0; i < 8; i++) {

    }


    // renderQRCode(matrix);

}

function gfAdd(a, b) {
    return a ^ b;
}

function generateGFTables() {
    let gfExp = Array.from({length: 512}, () => 1);
    let gfLog = Array.from({ length: 256}, () => 0);
    for (let i = 1; i < gfExp.length; i++) {
        gfExp[i] = gfExp[i - 1] << 1 > 255 ? (gfExp[i - 1] << 1) ^ 285 : gfExp[i - 1] << 1;
        if (i < 256) {
            gfLog[gfExp[i]] = i;
        }
    }
    return { gfExp, gfLog };
}

function gfMultiply(a, b, gfExp, gfLog) {
    if (a === 0 || b === 0) return 0;
    return gfExp[gfLog[a] + gfLog[b]];
}

function generateErrorCorrection(dataBytes, gfExp, gfLog) {
    const generator = [1, 127, 122, 154, 164, 11, 68, 117];
    const polynomial = [...dataBytes, 0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < 19; i++) {
        const leadCoefficient = polynomial[0];
        if (leadCoefficient !== 0) {
            for (let j = 0; j < generator.length; j++) {
                const temp = gfMultiply(generator[j], leadCoefficient, gfExp, gfLog);
                polynomial[j] = gfAdd(polynomial[j], temp);
            }
        }
        polynomial.shift();
    }

    return polynomial;

}

function createMatrix() {
    let matrix = Array.from({ length: 21 }, () => Array.from({ length: 21 }, () => -1));
    console.log(matrix);
    let finderPattern = Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => 0));

    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            finderPattern[i][j] = 11;
        }
    }

    for (let i = 1; i < 6; i++) {
        for (let j = 1; j < 6; j++) {
            finderPattern[i][j] = 10;
        }
    }

    for (let i = 2; i < 5; i++) {
        for (let j = 2; j < 5; j++) {
            finderPattern[i][j] = 11;
        }
    }
    console.log(finderPattern);

    const positions = [[0,0], [0, 14], [14, 0]];
    positions.forEach(([row, col]) => {
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                matrix[row + i][col + j] = finderPattern[i][j];
            }
        }
    })

    for (let i = 0; i < 8; i++) {
        matrix[i][7] = 10;
    }
    for (let i = 0; i < 8; i++) {
        matrix[7][i] = 10;
    }

    for (let i = 0; i < 8; i++) {
        matrix[i][13] = 10;
    }
    for (let i = 0; i < 8; i++) {
        matrix[7][matrix.length - i - 1] = 10;
    }
    for (let i = 0; i < 8; i++) {
        matrix[13][i] = 10;
    }
    for (let i = 0; i < 8; i++) {
        matrix[matrix.length - i - 1][7] = 10;
    }

    // Horizontal timing pattern
    for (let col = 8; col <= 12; col++) {
        matrix[6][col] = col % 2 === 0 ? 11 : 10;
    }
    // Vertical timing pattern
    for (let row = 8; row <= 12; row++) {
        matrix[row][6] = row % 2 === 0 ? 11 : 10;
    }

    // Single required blakc module
    matrix[13][8] = 11;


    // Format information areas
    for (let i = 0; i <= 8; i++) {
        if (matrix[8][i] === -1) matrix[8][i] = 2;
        if (matrix[i][8] === -1) matrix[i][8] = 2;
    }
    for (let i = 0; i < 8; i++) {
        if (matrix[8][21 - 1 - i] === -1) matrix[8][21 - 1 - i] = 2;
        if (matrix[21 - 1 - i][8] === -1) matrix[21 - 1 - i][8] = 2;
    }

    console.log(matrix);
    return matrix;
}

function renderQRCode(matrix) {
    const canvas = document.getElementById('qr-code');
    const ctx = canvas.getContext('2d');

    const moduleSize = 10;
    canvas.width = matrix.length * moduleSize;
    canvas.height = matrix.length * moduleSize;

    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            if (matrix[i][j] === 1 || matrix[i][j] === 11) {
                ctx.fillStyle = 'black';
            }
            else if (matrix[i][j] === 0 || matrix[i][j] == 10) {
                ctx.fillStyle = 'white';
            }
            else if (matrix[i][j] === 2) {
                ctx.fillStyle = "yellow";
            }
            else {
                ctx.fillStyle = 'lightgray';
            }
            ctx.fillRect(j * moduleSize, i * moduleSize, moduleSize, moduleSize);
        }
    }
    // ctx.fillRect(0,0, 150, 75);
}

function placeData(matrix, dataBytes) {
    const bits = dataBytes.flatMap(byte =>
        byte.toString(2).padStart(8, '0').split('').map(Number)
    );

    let bitIndex = 0;
    let direction = -1;

    for (let col = 20; col >= 0; col -= 2) {
        if (col === 6) col--;
        setTimeout(() => {
            console.log("Waiting");
            renderQRCode(matrix);
        }, 5000);

        const rows = direction === -1
            ? Array.from({ length: 21 }, (_, i) => 20 - i)
            : Array.from({ length: 21 }, (_, i) => i)

        for (let row of rows) {
            for (let c of [col, col - 1]) {
                if (matrix[row][c] === -1) {
                    matrix[row][c] = bits[bitIndex] || 0;
                    bitIndex++;
                }
            }
        }
        direction *= -1;
    }

    return matrix;

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function placeDataAnimated(matrix, dataBytes, renderCallback) {
    const bits = dataBytes.flatMap(byte => 
        byte.toString(2).padStart(8, '0').split('').map(Number)
    );
    
    let bitIndex = 0;
    let direction = -1;
    
    for (let col = 20; col >= 0; col -= 2) {
        if (col === 6) col--;
        
        const rows = direction === -1 
            ? Array.from({length: 21}, (_, i) => 20 - i)
            : Array.from({length: 21}, (_, i) => i);
        
        for (let row of rows) {
            for (let c of [col, col - 1]) {
                if (matrix[row][c] === -1) {
                    matrix[row][c] = bits[bitIndex] || 0;
                    bitIndex++;
                    
                    // Render and pause
                    renderCallback(matrix);
                    await sleep(50); // 50ms delay
                }
            }
        }
        
        direction *= -1;
    }
}

function applyMask(matrix, maskNumber) {
    const masked = matrix.map(row => [...row]);

    for (let i = 0; i < 21; i++) {
        for (let j = 0; j < 21; j++) {
            if (masked[i][j] === 0 || masked[i][j] === 1) {
                if (shouldFlip(i , j, maskNumber)) {
                    masked[i][j] = masked[i][j] === 1 ? 0 : 1;
                }
            }
        }
    }
    return masked;
}

function shouldFlip(i, j, maskNumber) {
    switch(maskNumber) {
        case 0: return (i + j) % 2 === 0;
        case 1: return i % 2 === 0;
        case 2: return j % 3 === 0;
        case 3: return (i + j) % 3 === 0;
        case 4: return (Math.floor(i/2) + Math.floor(j/3)) % 2 === 0;
        case 5: return ((i * j) % 2) + ((i * j) % 3) === 0;
        case 6: return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
        case 7: return (((i + j) % 2) + ((i * j) % 3)) % 2 === 0;
    }
}

function penalty(matrix) {
    return streaks(matrix) + secondRule(matrix);
}

function streaks(matrix) {
    let penalty = 0;
    for (const row of matrix) {
        let curr = row[0];
        let count = 1;
        for (let i = 1; i < row.length; i++) {
            if (row[i] === curr) {
                count += 1;
            }
            else {
                if (count >= 5) {
                    penalty += (3 + count - 5)
                }
                count = 1;
                curr = row[i];
            }
        }
        if (count >= 5) {
            penalty += (3 + count - 5)
        }
    }
    
    for (let j = 0; j < matrix.length; j++) {
        let count = 1;
        let curr = matrix[0][j];
        for (let i = 0; i < matrix.length; i++) {
            if (matrix[i][j] === curr) {
                count += 1;
            }
            else {
                if (count >= 5) {
                    penalty += (3 + count - 5);
                }
                count = 1;
                curr = matrix[i][j];
            }
        }
        if (count >= 5) {
            penalty += (3 + count - 5);
        }
    }
    return penalty;
}

function secondRule(matrix) {
    let penalty = 0;
    for (let i = 0; i < matrix.length - 1; i++) {
        for (let j = 0; j < matrix.length - 1; j++) {
            const topLeft = matrix[i][j];
            const topRight = matrix[i][j + 1];
            const bottomLeft = matrix[i + 1][j];
            const bottomRight = matrix[i + 1][j + 1];
            if (
                topLeft === topRight &&
                topLeft === bottomLeft &&
                topLeft === bottomRight
            ) {
                penalty += 3;
            }
        }
    }
    return penalty;
}

function generateFormatErrorCorrection(formatBits) {
    let data = parseInt(formatBits, 2) << 10;
    const generator = 0b10100110111;

    for (let i = 0; i < 5; i++) {
        if ((data >> (14 - i)) & 1) {
            data ^= (generator << (4 - i));
        }
    }
    return data.toString(2).padStart(10, '0');
}

qrSubmit.addEventListener('click', handleSubmit, false);
