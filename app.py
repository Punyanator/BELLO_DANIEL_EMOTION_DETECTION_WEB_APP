from flask import Flask, render_template, request, jsonify
import os
from deepface import DeepFace
from werkzeug.utils import secure_filename

app = Flask(__name__)

UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400

        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Perform analysis
        analysis = DeepFace.analyze(img_path=filepath, actions=['emotion'], detector_backend='retinaface')

        # DeepFace sometimes returns a list
        if isinstance(analysis, list):
            analysis = analysis[0]

        dominant = analysis.get('dominant_emotion', 'unknown')
        emotions = analysis.get('emotion', {})

        # Convert float32 → float for JSON serialization
        emotions_clean = {k: float(v) for k, v in emotions.items()}

        return jsonify({
            'emotion': dominant,
            'emotions': emotions_clean,
            'file': filename
        })

    except Exception as e:
        return jsonify({'error': 'analysis_failed', 'message': str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
