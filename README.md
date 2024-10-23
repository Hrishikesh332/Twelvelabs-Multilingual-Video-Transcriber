<br />
<div align="center">

  <h3 align="center">MultiLingual Video Transcriber</h3>
  <p align="center">
    Seamlessly transcribe videos across multiple languages using advanced AI models.
    <br />
    <a href="https://github.com/Hrishikesh332/Twelvelabs-Multilingual-Video-Transcriber"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://twelvelabs-multilingual-video-transcriber.onrender.com/">View Demo</a>
    ·
    <a href="https://github.com/Hrishikesh332/Twelvelabs-Multilingual-Video-Transcriber/issues">Report Bug</a>
    ·
    <a href="https://github.com/Hrishikesh332/Twelvelabs-Multilingual-Video-Transcriber/issues">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about">About</a></li>
    <li><a href="#features">Features</a></li>
    <li><a href="#tech-stack">Tech Stack</a></li>
    <li><a href="#instructions-on-running-project-locally">Instructions on running project locally</a></li>
    <li><a href="#usecases">Usecases</a></li>
    <li><a href="#feedback">Feedback</a></li>
  </ol>
</details>

------

## About

The **MultiLingual Video Transcriber** leverages the power of Twelve Labs models to automatically transcribe videos in multiple languages. Whether you're a content creator, educator, or professional working with international audiences, this tool will save time and improve accessibility by accurately converting spoken language into text across various languages.

Also, providing the time stamp interaction with the video, for the proper tracking of the spoken words and the transcript at the same time.

## Demonstration Video

Try out the application now:

[![MultiLingual Video Transcriber](https://img.shields.io/badge/Transcriber-Launch_the_App-4CAF50?style=for-the-badge)](https://twelvelabs-multilingual-video-transcriber.onrender.com/)

- Video to be Added

## Features

🌍 **Multi Language Transcription**: Automatically transcribe videos into multiple languages with accuracy.

📝 **Download Transcripts**: Export, and review the transcripts to suit your needs.


## Tech Stack

**Frontend** - HTML, CSS, JavaScript  
**Backend** - Flask, Twelve Labs AI APIs  
**AI Technologies** - Twelve Labs (Marengo 2.6 and Pegasus 1.1)

## Instructions on Running Project Locally:

Clone the project

```bash
  git clone https://github.com/Hrishikesh332/Twelvelabs-Multilingual-Video-Transcriber.git

```

Install Dependencies

```
 cd Twelvelabs-Multilingual-Video-Transcriber
 
 pip install -r requirements.txt
```

Prepare the .emv file as per the instrcution. The .env file is provided below

```
API_KEY = "<Your API Key>"
API_URL = "https://api.twelvelabs.io/v1.2"
```

To Run the Server Locally

```
python app.py
```

## Usecases

📚 **Content Creation** : Effortlessly transcribe video content for subtitles and translations, making it accessible to a global audience.

🎓 **Education** : Teachers and educators can use this tool to transcribe lectures or educational content in multiple languages, enhancing learning for students worldwide.

💼 **Business Meetings** : Transcribe multilingual meetings or conferences to ensure clear communication and documentation across different regions.

## Feedback

If you have any feedback, please reach out to us at **hriskikesh.yadav332@gmail.com**
