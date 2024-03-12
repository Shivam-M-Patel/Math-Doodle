import json
import torch
from flask import Flask, render_template, request, jsonify
from PIL import Image, ImageChops, ImageOps
from torchvision import transforms
from model import Model
from train import SAVE_MODEL_PATH
import random 
import os

app = Flask(__name__)
predict = None

# Json file to store data of top 15 users and score
SCOREBOARD_FILE = os.path.join("database", "scoreboard.json")

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/DigitRecognition", methods=["POST"])
def predict_digit():
    img = Image.open(request.files["img"]).convert("L")

    # predict
    res_json = {"pred": 0, "probs": [0]}
    if predict is not None:
        res = predict(img)
        res_json["pred"] = int(res.argmax())
        res_json["probs"] = [p * 100 for p in res]

    return json.dumps(res_json)

@app.route("/check_answer", methods=["POST"])
def check_answer():
    # Get the predicted digit from the request
    predicted_digit = int(request.json["predicted_digit"])
    
    # Get the actual answer from the server (you may need to modify this part to get the actual answer)
    correct_answer = int(request.json["correct_answer"])
    # Compare the predicted digit with the actual answer
    if predicted_digit == correct_answer:
        correct = True
    else:
        correct = False

    # Return the response indicating whether the answer is correct and the corresponding message
    return jsonify({"correct": correct})

@app.route("/new_equation")
def new_equation():
    equation, answer = generate_random_equation()
    return jsonify({"equation": equation, "answer": answer})


@app.route('/submit-score', methods=['POST'])
def submit_score():
    data = request.get_json()
    name = data.get('name')
    score = data.get('score')

    if not name or not score:
        return jsonify({"error": "Name and score are required"}), 400

    # Load existing scoreboard
    scoreboard = load_scoreboard()

    # Check if score is high enough
    if is_high_score(score, scoreboard):
        # Add new entry to scoreboard
        scoreboard.append({"name": name, "score": score})
        # Sort the scoreboard by score in descending order
        scoreboard.sort(key=lambda x: x['score'], reverse=True)
        # Trim the scoreboard to the top 15 scores if it exceeds 15 entries
        if len(scoreboard) > 15:
            scoreboard = scoreboard[:15]
        # Save updated scoreboard
        save_scoreboard(scoreboard)
        return jsonify({"message": "Score saved successfully"}), 200
    else:
        return jsonify({"message": "Score is not high enough"}), 200

@app.route('/top-scores')
def get_top_scores():
    scoreboard = load_scoreboard()
    return jsonify(scoreboard[:15])

def load_scoreboard():
    try:
        with open(SCOREBOARD_FILE, 'r') as f:
            scoreboard = json.load(f)
    except FileNotFoundError:
        scoreboard = []
    return scoreboard

def save_scoreboard(scoreboard):
    with open(SCOREBOARD_FILE, 'w') as f:
        json.dump(scoreboard, f, indent=4)

def is_high_score(score, scoreboard):
    if len(scoreboard) < 15:
        return True
    return score > scoreboard[-1]['score']


class Predict():
    def __init__(self):
        device = torch.device("cpu")
        self.model = Model().to(device)
        self.model.load_state_dict(torch.load(SAVE_MODEL_PATH, map_location=device))
        self.transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5,), (0.5,))])

    def _centering_img(self, img):
        left, top, right, bottom = img.getbbox()
        w, h = img.size[:2]
        shift_x = (left + (right - left) // 2) - w // 2
        shift_y = (top + (bottom - top) // 2) - h // 2
        return ImageChops.offset(img, -shift_x, -shift_y)

    def __call__(self, img):
        img = ImageOps.invert(img)
        img = self._centering_img(img)
        img = img.resize((28, 28), Image.BICUBIC)  # resize to 28x28
        tensor = self.transform(img)
        tensor = tensor.unsqueeze_(0)  # 1,1,28,28

        self.model.eval()
        with torch.no_grad():
            preds = self.model(tensor)
            preds = preds.detach().numpy()[0]

        return preds

def generate_random_equation():
    # Generate a simple equation
    operand1 = random.randint(0, 19) 
    operand2 = random.randint(0, 19) 
    operator = random.choice(["+", "-", "*"])
    
    if operator == "+":
        operand2 = min(operand2, 19 - operand1)  # Ensure result is within 0-19 range
    elif operator == "-":
        operand2 = min(operand2, operand1)  # Ensure result is non-negative
    else:
        operand2 = min(operand2, 19 // operand1)  # Ensure result is within 0-19 range
    
    result = eval(f"{operand1} {operator} {operand2}")
    equation = f"{operand1} {operator} {operand2}"
    
    if result > 9:
        # Add a division operator and a number to bring the result back within the range
        for operand4 in range(2, result + 1):
            if result % operand4 == 0:
                equation = f"({equation}) / {operand4}"
                result = eval(equation)
                break
            
    return equation, result

if __name__ == "__main__":
    assert os.path.exists(SAVE_MODEL_PATH), "no saved model"
    predict = Predict()
    app.run(host="0.0.0.0", port=5001)