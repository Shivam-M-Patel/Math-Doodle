const cvsIn = document.getElementById("inputimg");
const ctxIn = cvsIn.getContext("2d");
const divOut = document.getElementById("pred");
let svgGraph = null;
let mouselbtn = false;
let gameStarted = false;

// Global variables to store the weight factor, exponent to calculate score
const weightFactor = 100;
const exponent = 2;
let currScore = 0;

// Variables to keep track of equation and answer
let currentEquation = "";
let currentAnswer = "";

// initilize
window.onload = () => {
    ctxIn.fillStyle = "white";
    ctxIn.fillRect(0, 0, cvsIn.width, cvsIn.height);
    ctxIn.lineWidth = 7;
    ctxIn.lineCap = "round";
    initProbGraph();
}

function initProbGraph() {
    const dummyData = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; // dummy data for initialize graph
    const margin = { top: 10, right: 10, bottom: 10, left: 20 };
    const width = 250;
    const height = 196;

    const yScale = d3.scaleLinear()
        .domain([9, 0])
        .range([height, 0]);

    svgGraph = d3.select("#probGraph")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svgGraph.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(yScale));

    const barHeight = 20
    svgGraph.selectAll("svg")
        .data(dummyData)
        .enter()
        .append("rect")
        .attr("y", (d, i) => (yScale(i) - barHeight / 2))
        .attr("height", barHeight)
        .style("fill", "green")
        .attr("x", 0)
        .attr("width", d => d * 2)
        .call(d3.axisLeft(yScale));
}

cvsIn.addEventListener("mousedown", e => {
    // If the game has not started, prevent drawing
    if (!gameStarted) return;

    if (e.button === 0) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        mouselbtn = true;
        ctxIn.beginPath();
        ctxIn.moveTo(x, y);
    }
    else if (e.button === 2) {
        onClear();  // clear by mouse right button
    }
});

cvsIn.addEventListener("mouseup", e => {
    if (e.button === 0) {
        mouselbtn = false;
        onRecognition();
    }
});

cvsIn.addEventListener("mousemove", e => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (mouselbtn) {
        ctxIn.lineTo(x, y);
        ctxIn.stroke();
    }
});

cvsIn.addEventListener("touchstart", e => {
    // for touch device
    if (e.targetTouches.length === 1) {
        const rect = e.target.getBoundingClientRect();
        const touch = e.targetTouches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        ctxIn.beginPath();
        ctxIn.moveTo(x, y);
    }
});

cvsIn.addEventListener("touchmove", e => {
    // for touch device
    if (e.targetTouches.length === 1) {
        const rect = e.target.getBoundingClientRect();
        const touch = e.targetTouches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        ctxIn.lineTo(x, y);
        ctxIn.stroke();
        e.preventDefault();
    }
});

cvsIn.addEventListener("touchend", e => onRecognition());
cvsIn.addEventListener("contextmenu", e => e.preventDefault());

document.getElementById("clearbtn").onclick = onClear;
function onClear() {
    mouselbtn = false;
    ctxIn.fillStyle = "white";
    ctxIn.fillRect(0, 0, cvsIn.width, cvsIn.height);
    ctxIn.fillStyle = "black";
}

// Recognition function calls check answer
function onRecognition() {
    console.time("time");

    cvsIn.toBlob(async blob => {
        const body = new FormData();
        body.append('img', blob, "dummy.png")
        try{
            const response = await fetch("./DigitRecognition", {
                method: "POST",
                body: body,
            })
            const resjson = await response.json()
            checkAnswer(resjson)
        } catch (error){
            alert("error", error)
        }
    })

    console.timeEnd("time");
}

// Check Answer function to compare answers and update score
async function checkAnswer(res) {
    divOut.textContent = res.pred;
    document.getElementById("prob").innerHTML =
        "Probability : " + res.probs[res.pred].toFixed(2) + "%";
    svgGraph.selectAll("rect")
        .data(res.probs)
        .transition()
        .duration(300)
        .style("fill", (d, i) => i === res.pred ? "blue" : "green")
        .attr("width", d => d * 2)

        // Check the answer using the check_answer route
        try {
            // Send the recognized digit and correct answer to the server for answer checking
            const response = await fetch("/check_answer", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // correct_answer: correctAnswer,
                    predicted_digit: res.pred,
                    correct_answer: currentAnswer,
                })
            });

            const result = await response.json();

            // If the answer is correct, fetch a new equation
            if (result.correct) {
                // currScore++;
                currScore += calculateScore(res.probs[res.pred].toFixed(2) / 100);
                fetchNewEquation();
                onClear();
                document.getElementById('score-container').innerHTML = ' Score: ' + currScore;

            } else {
                document.getElementById('score-container').innerHTML = ' Score: ' + currScore;
            }
        } catch (error) {
            console.error("Error:", error);
        }
}

// Start the game
document.getElementById('play-btn').addEventListener('click', function () {
    startGame();
});

// Start game function to fetch equation and start timer
function startGame() {
    gameStarted = true;
    document.getElementById('play-btn').style.display = 'none';
    document.getElementById('equation-container').style.display = 'block';
    fetchNewEquation(); // Start the game by fetching a new equation
    startTimer(); // Start the timer
}

// Function to update the timer every second
function startTimer() {
    let timer = 45; // Timer duration in seconds
    const display = document.querySelector('#timer');

    // Update the timer every second
    const intervalId = setInterval(function () {
        timer--;
        if (timer >= 0) {
            display.textContent = timer; // Update the timer display
        } else {
            clearInterval(intervalId); // Stop the timer when it reaches zero
            endGame(); // Timer expired, end the game
        }
    }, 1000);
}

// End game function to save score if the score is high enough
async function endGame() {
    alert("Game over! Your score: " + currScore);

    try {
        // Fetch the top scores from the server
        const response = await fetch('/top-scores');
        const topScores = await response.json();

        // Check if the score is high enough to be saved in the database (greater than the last score)
        if (topScores.length === 0 || currScore > topScores[topScores.length - 1].score) {
            console.log("Current score is higher than the last score from the database.");

            // Prompt the user for their name
            const userName = prompt("Congratulations! You've achieved a high score! Enter your name:");

            if (userName) {
                // Send a POST request to the server to save the score
                const submitResponse = await fetch('/submit-score', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: userName, score: currScore })
                });

                if (submitResponse.ok) {
                    console.log("Score submitted successfully");
                    // Reload the page after successful submission
                    window.location.reload();
                } else {
                    console.error("Failed to submit score");
                }
            }
        } else {
            console.log("Current score is not higher than the last score from the database.");
        }
    } catch (error) {
        console.error("Error:", error);
    }

    gameStarted = false;
    resetGame();
}


// Function to reset the game after the round
function resetGame() {
    gameStarted = false;
    currScore = 0;
    onClear();
    document.getElementById('play-btn').style.display = 'inline-block';
    document.getElementById('equation-container').style.display = 'none';
    document.getElementById('timer').textContent = '60';
    document.getElementById('pred').innerHTML = "0";
    document.getElementById('score-container').innerHTML = "Score: 0";
    document.getElementById('prob').innerHTML = "Probability: 0%";
}

// Function to fetch a new equation from the server
function fetchNewEquation() {
    fetch('/new_equation')
        .then(response => response.json())
        .then(data => {
            currentEquation = data.equation;
            currentAnswer = data.answer;
            score = data.score;
            document.getElementById('equation').innerText = data.equation;
        });
}

function calculateScore(probability) {
    // Calculate the score using a power function: score = weightFactor * (probability ^ exponent)
    let score = weightFactor * Math.pow(probability, exponent);
    return Math.round(score); // Round the score to the nearest integer
}

// Fetch scoreboard data from the server
fetch('/top-scores')
.then(response => response.json())
.then(scoreboard => {
    const scoreboardTable = document.getElementById('scoreboardTable');

    // Iterate over the scoreboard data and populate the table rows
    scoreboard.forEach((entry, index) => {
        const row = scoreboardTable.insertRow(); // Insert a new row

        // Add appropriate CSS classes to the cells
        const posCell = row.insertCell();
        posCell.className = 'posCell'; // Add class for position cell
        const nameCell = row.insertCell();
        nameCell.className = 'nameCell'; // Add class for name cell
        const scoreCell = row.insertCell();
        scoreCell.className = 'scoreCell'; // Add class for score cell

        posCell.textContent = index + 1; // Set position
        nameCell.textContent = entry.name; // Set name
        scoreCell.textContent = entry.score; // Set score

        // Add class for the top 3 rows
        if (index < 3) {
            row.classList.add('top3');
        }
    });
})
.catch(error => console.error("Error:", error));