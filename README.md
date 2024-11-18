# Chatbot

![Screenshot 2024-11-18 at 6 32 34 PM](https://github.com/user-attachments/assets/94090a02-79e5-449a-a3e4-b9cd6cdb6be8)


## Project Overview

This project is a chatbot developed using Rasa, designed to handle user inquiries and provide responses based on natural language understanding. The chatbot integrates with a Flask backend and utilizes PostgreSQL for data storage. It is deployed on AWS or Google Cloud for scalability and reliability.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

- Natural language understanding to interpret user queries.
- Integration with external APIs for real-time data retrieval.
- User-friendly interface for seamless interaction.
- Logging of conversations for analysis and improvement of the chatbot's performance.
- Support for multiple intents and entities.

## Technologies Used

- **Programming Language:** Python
- **Frameworks:** 
  - Rasa for chatbot development
  - Flask for creating REST APIs
- **NLP Libraries:** 
  - SpaCy
  - NLTK
- **Database:** 
  - PostgreSQL
  - SQLite (for local development)
- **Deployment:** 
  - AWS or Google Cloud
- **Version Control:** 
  - Git and GitHub
- **Additional Tools:** 
  - Docker
  - Postman
  - Jupyter Notebook

## Installation

To set up the project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anudeep654/smartchat.git
   cd smartchat
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install the required packages:**
   ```bash
   pip install -r requirements.txt
   ```

4. **To start the chatbot, run the following commands:**
   ```bash
   rasa train - to Train the model.
   rasa run actions - to run the actions.
   rasa run --debug - to run the actions server.
   ```
