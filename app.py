from flask import Flask, render_template, request, jsonify, send_from_directory, session
from werkzeug.utils import secure_filename
import os
import uuid
from twelvelabs import TwelveLabs
from twelvelabs.models.task import Task
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("API_KEY")

app = Flask(__name__)
app.secret_key = os.urandom(24)  

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

client = TwelveLabs(api_key=API_KEY)
headers = {
    "x-api-key": API_KEY
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

def on_task_update(task: Task):
    print(f" Status={task.status}")

def process_video(filepath, language):
    try:
        if 'index_id' not in session:
            index_name = f"Translate{uuid.uuid4().hex[:8]}"
            engines = [
                {
                    "name": "pegasus1.1",
                    "options": ["visual", "conversation"]
                },
                {
                    "name": "marengo2.6",
                    "options": ["visual", "conversation", "text_in_video", "logo"]
                }
            ]
            index = client.index.create(
                name=index_name,
                engines=engines
            )
            session['index_id'] = index.id
            print(f"Created new index with ID: {index.id}")
        else:
            print(f"Using existing index with ID: {session['index_id']}")

        task = client.task.create(index_id=session['index_id'], file=filepath)
        
        task.wait_for_done(sleep_interval=5, callback=on_task_update)
        if task.status != "ready":
            raise RuntimeError(f"Indexing failed with status {task.status}")
        print(f"The unique identifier of your video is {task.video_id}.")
        
        prompt = f"Provide the Transcript in the Translated {language.capitalize()} Language with the timestamp of the Indexed Video Content."
        res = client.generate.text(video_id=task.video_id, prompt=prompt, temperature=0.25)
        print("Raw API Response:")
        print(res.data)
        
        return {
            'status': 'ready',
            'message': 'File processed successfully',
            'transcript': res.data,
            'video_path': f'/uploads/{os.path.basename(filepath)}'
        }
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        return {'status': 'error', 'message': str(e)}

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part'}), 400
    file = request.files['file']
    language = request.form.get('language', 'german')
    
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        result = process_video(filepath, language)
        return jsonify(result)
    
    return jsonify({'status': 'error', 'message': 'File type not allowed'}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.run(debug=True)