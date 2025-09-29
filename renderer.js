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

    renderQRCode(matrix);

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
            finderPattern[i][j] = 1;
        }
    }

    for (let i = 1; i < 6; i++) {
        for (let j = 1; j < 6; j++) {
            finderPattern[i][j] = 0;
        }
    }

    for (let i = 2; i < 5; i++) {
        for (let j = 2; j < 5; j++) {
            finderPattern[i][j] = 1;
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
        matrix[i][7] = 0;
    }
    for (let i = 0; i < 8; i++) {
        matrix[7][i] = 0;
    }

    for (let i = 0; i < 8; i++) {
        matrix[i][13] = 0;
    }
    for (let i = 0; i < 8; i++) {
        matrix[7][matrix.length - i - 1] = 0;
    }
    for (let i = 0; i < 8; i++) {
        matrix[13][i] = 0;
    }
    for (let i = 0; i < 8; i++) {
        matrix[matrix.length - i - 1][7] = 0;
    }

    console.log(matrix);
    return matrix;
}

function renderQRCode(matrix) {
    const canvas = document.getElementById('qr-code');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle="black";
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            ctx.fillStyle = matrix[i][j] === 1 ? 'black' : 'white';
            ctx.fillRect(i,j, 1, 1);
        }
    }
    // ctx.fillRect(0,0, 150, 75);
}

qrSubmit.addEventListener('click', handleSubmit, false);
