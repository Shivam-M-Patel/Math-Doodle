# Math Doodle Challenge Game

This project is a Flask web application that combines the power of PyTorch for handwritten digit recognition with a fun and engaging math game.

Features:

-> Interactive Gameplay: Users click "play" to start, and a random equation is displayed.
-> Doodle Canvas: Users draw the answer to the equation directly on a canvas.
-> PyTorch-Powered Recognition: The trained PyTorch model analyzes the user's drawing and predicts the digit.
-> Probability Display: The web app shows the probability of the predicted digit being correct.
-> Score System: Scores are based on the prediction probability, rewarding higher certainty.
-> Highscore Table: The top 15 highest scores are stored and displayed.
-> Hall of Fame: Users achieving top 15 scores are prompted to enter their name for the highscore table.

Requirements:
 
-> Python 3.x
-> Flask
-> PyTorch
-> Additional libraries for the canvas element (e.g., HTML5 Canvas or a JavaScript library)

Setup:

Clone this repository: git clone https://github.com/<your-username>/math-doodle-challenge.git
Install dependencies: using pip install "dependency"
Train the PyTorch model 

Running the Application:

Navigate to the project directory: cd math-doodle-challenge
Run the Flask development server: python app.py
Access the application in your web browser: http://127.0.0.1:5000/ (Default Flask development port)
