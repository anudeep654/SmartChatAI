from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import requests

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Replace with a secure key in a real application
LOCAL_RASA_API_URL = 'http://localhost:5005/webhooks/rest/webhook'
HOSTED_RASA_API_URL = 'https://smartchatrasarun.loca.lt/webhooks/rest/webhook'

RASA_API_URL = LOCAL_RASA_API_URL


@app.route('/')
def home():
    return render_template('login.html')


@app.route('/login', methods=['POST'])
def login():
    # Handle login logic
    username = request.form.get('username')
    password = request.form.get('password')

    # For demonstration, we're storing user data in the session
    # In a real application, you should authenticate the user and handle passwords securely
    session['user'] = {
        'username': username,
        'password': password
    }

    return redirect(url_for('dashboard'))


@app.route('/dashboard')
def dashboard():
    # Retrieve user data from the session
    user = session.get('user')

    if not user:
        return redirect(url_for('home'))

    # Pass user data to the template
    return render_template('dashboard.html', user=user)


@app.route('/webhook', methods=['POST'])
def webhook():
    user_message = request.json.get('message', '')

    # Check if user_message is a dictionary
    if isinstance(user_message, dict):
        # Convert dictionary to a string if it's in dictionary format
        user_message = str(user_message)

    print("User Message:", user_message)

    # Send user message to Rasa and get bot's response
    rasa_response = requests.post(RASA_API_URL, json={'sender': 'user', 'message': user_message})
    rasa_response_json = rasa_response.json()

    print("Rasa Response:", rasa_response_json)

    # Initialize response data
    bot_text = None
    bot_buttons = []
    bot_attachment = None
    custom_data = None

    if rasa_response_json:
        response = {'text': '', 'buttons': [], 'attachments': []}

        # Loop through each response item
        for response_item in rasa_response_json:
            bot_text = response_item.get('text')
            bot_buttons = response_item.get('buttons', [])
            bot_attachment = response_item.get('attachment')
            custom_data = response_item.get('custom')

            # Collect custom data if present
            if custom_data:
                response['custom'] = custom_data

            # Collect all text messages
            if bot_text:
                response['text'] += bot_text + " "

            # Collect buttons if any
            if bot_buttons:
                response['buttons'].extend(bot_buttons)

            # Collect attachments if any
            if bot_attachment:
                response['attachments'].append(bot_attachment)

        # Trim the final text response
        response['text'] = response['text'].strip()

        return jsonify(response)
    else:
        return jsonify({'text': 'Sorry, I didn’t understand that.', 'buttons': []})


@app.route('/logout')
def logout():
    # Clear the session
    session.pop('user', None)
    return redirect(url_for('home'))


if __name__ == '__main__':
    app.run(port=5004, debug=True)

