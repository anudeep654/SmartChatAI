# actions.py
from typing import Any, Text, Dict, List
from fpdf import FPDF
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from datetime import datetime
from rasa_sdk.events import SlotSet, FollowupAction, AllSlotsReset
import logging
import mysql.connector
from rasa_sdk.forms import FormValidationAction
import json
import matplotlib.pyplot as plt
import io
import base64
import time

logger = logging.getLogger(__name__)


class ActionGreetUser(Action):

    def name(self) -> Text:
        return "action_greet_user"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        current_hour = datetime.now().hour

        if current_hour < 12:
            dispatcher.utter_message(response="utter_greet_morning")
        else:
            dispatcher.utter_message(response="utter_greet_evening")
        return []


class ActionResetSlots(Action):
    def name(self) -> str:
        return "action_reset_slots"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[str, Any]) -> List[Dict[str, Any]]:
        # Reset all slots
        dispatcher.utter_message(response="utter_switch_service")

        return [AllSlotsReset()]


class ActionHandleServiceSelection(Action):
    def name(self) -> str:
        return "action_handle_service_selection"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: dict) -> list:
        service = tracker.get_slot('service')
        logger.info(f"Action 'action_handle_service_selection' was called with service: {service}")
        if service == 'account_services':
            dispatcher.utter_message(text="You've selected Account Services. What would you like to do?")
        elif service == "credit_card":
            print(f"service -> ", service)
            print(f"annual_income -> ", tracker.get_slot('annual_income'))
            print(f"preferences -> ", tracker.get_slot('preferences'))
            print(f"annual_fee -> ", tracker.get_slot('annual_fee'))
            if tracker.get_slot('annual_income') is None:
                dispatcher.utter_message(
                    text="To help us recommend the best credit card for you, we'll need to ask you a few questions. "
                         "<br /> <br/> <br /> Could you please provide your annual income?")
                return [SlotSet("service", service)]
            elif tracker.get_slot('preferences') is None:
                dispatcher.utter_message(
                    text="What are you looking for in a credit card? lounges, food, rewards?")
                return [SlotSet("service", service)]
            elif tracker.get_slot('annual_fee') is None:
                dispatcher.utter_message(text="Are you okay with an annual fee? Please respond with Yes or No.")
                return [SlotSet("service", service)]
            else:
                # All slots are filled
                return [FollowupAction("action_show_credit_cards")]
        elif service == "financial_planning":
            print(f"investments -> {tracker.get_slot('investments')}")
            if tracker.get_slot('investments') is None:
                dispatcher.utter_message(
                    text="You've selected Financial Services & Investment planning.")
            # HTML form for investment plans with dropdowns
            # You can send some data as needed, or skip this part entirely
            dispatcher.utter_message(
                custom={"form_name": "financial_planning_form"}
            )
            return [SlotSet("service", service)]
        elif service == "loan_services":
            dispatcher.utter_message(response="utter_loan_services")
            # return [FollowupAction("loan_assessment_form")]
            return []
        elif service == "view_loan_products":
            return [FollowupAction("action_show_additional_loan_products")]

        elif service == "currency_exchange":
            print(f"came to currency exchange with service -> ", service);
            return [FollowupAction("action_show_currency_exchange")]
        else:
            dispatcher.utter_message(text="I'm sorry, I didn't understand your selection. Can you please try again?")

        return []


def get_connection():
    return mysql.connector.connect(
        host="mydatabase.cf24mkuumocv.ap-southeast-1.rds.amazonaws.com",
        port="3306",
        user="admin",
        password="EI3bupbQfg47roGTh60d",
        database="mydatabase"
    )


class ActionDownloadStatement(Action):
    def name(self) -> str:
        return "action_download_statement"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: dict) -> list:
        # Connect to MySQL
        connection = get_connection()  # Use the imported function
        cursor = connection.cursor()

        # Ensure the table exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS account_statements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                statement TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Check if data exists for the user
        cursor.execute("SELECT statement FROM account_statements WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
                       (tracker.sender_id,))
        result = cursor.fetchone()

        if result:
            # If data exists, generate the PDF and download
            statement = result[0]
            pdf = FPDF()
            pdf.add_page()
            pdf.set_font("Arial", size=12)
            pdf.multi_cell(0, 10, statement)

            # Save the PDF to a file
            pdf_file = f"statement_{tracker.sender_id}.pdf"
            pdf.output(pdf_file)

            # Notify the user
            time.sleep(3)
            dispatcher.utter_message(text=f"Here is your statement for the last month.")
            # Prepare the PDF file name with current date
            today_date = datetime.now().strftime("%Y_%m_%d")
            pdf_file_name = f"Download_statement_{today_date}.pdf"
            dispatcher.utter_message(
                attachment={"type": "file", "payload": {"title": pdf_file_name, "url": pdf_file}})
        else:
            # If no data, insert a new statement for the user
            sample_statement = "Your bank statement details for the last month."
            cursor.execute("INSERT INTO account_statements (user_id, statement) VALUES (%s, %s)",
                           (tracker.sender_id, sample_statement))
            connection.commit()

            # Retrieve the newly inserted statement and generate the PDF
            cursor.execute(
                "SELECT statement FROM account_statements WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
                (tracker.sender_id,))
            statement = cursor.fetchone()[0]
            pdf = FPDF()
            pdf.add_page()
            pdf.set_font("Arial", size=12)
            pdf.multi_cell(0, 10, statement)

            # Save the PDF to a file
            pdf_file = f"statement_{tracker.sender_id}.pdf"
            pdf.output(pdf_file)

            # Notify the user
            time.sleep(3)
            dispatcher.utter_message(text="A new statement has been created and downloaded for you.")
            dispatcher.utter_message(
                attachment={"type": "file", "payload": {"title": "Download Statement", "url": pdf_file}})

        # Close the connection
        connection.close()

        return []


class ActionSwitchService(Action):
    def name(self) -> str:
        return "action_switch_service"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: dict) -> list:
        dispatcher.utter_message(template="utter_switch_service")
        return []


class ActionShowCreditCards(Action):

    def name(self):
        return "action_show_credit_cards"

    def run(self, dispatcher, tracker, domain):
        # Connect to the MySQL database
        connection = get_connection()  # Use the imported function
        cursor = connection.cursor(dictionary=True)

        # Normalize the annual_fee slot value
        annual_fee_slot = tracker.get_slot("annual_fee").strip().lower()

        # Convert the normalized slot value to match the database format
        annual_fee_db_value = 1 if annual_fee_slot == "yes" else 0

        # Retrieve the relevant credit card information
        query = """
               SELECT * FROM credit_cards
               WHERE annual_fee_acceptable = %s
           """
        cursor.execute(query, (annual_fee_db_value,))
        cards = cursor.fetchall()

        # Dispatch the carousel to the user
        time.sleep(3)
        dispatcher.utter_message(text="Here are some credit cards that match your preferences:",
                                 custom={"cards": cards})

        # Close the database connection
        cursor.close()
        connection.close()

        return []


class ActionSubmitInvestmentForm(Action):
    def name(self) -> Text:
        return "action_submit_investment_form"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        # Connect to the MySQL database
        print(f"came to action_show_investment_options service")
        connection = get_connection()  # Use the imported function

        cursor = connection.cursor(dictionary=True)
        query = "SELECT * FROM investment_options"
        cursor.execute(query)
        results = cursor.fetchall()

        # Close the database connection
        cursor.close()
        connection.close()

        # Prepare the data for the response
        investment_options = []
        for row in results:
            investment_options.append({
                'name': row['name'],
                'description': row['description'],
                'packages': row['packages'],
                'monthly_payment': row['monthly_payment'],
                'returns': row['returns'],
                'interest_rate': row['interest_rate'],
                'apply_link': row['apply_link'],
                'color': row['color']
            })

        time.sleep(3)
        dispatcher.utter_message(custom={'investments': investment_options})
        return []


# Action to save the form data to the database
class ActionSaveLoanAssessmentData(Action):

    def name(self) -> str:
        return "action_save_loan_assessment_data"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        connection = get_connection()
        if connection:
            cursor = connection.cursor()
            try:
                # Create table if it doesn't exist
                create_table_query = """
                CREATE TABLE IF NOT EXISTS loan_assessments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    loan_reason VARCHAR(255),
                    loan_amount VARCHAR(255),
                    avg_loan_amount FLOAT,
                    loan_tenure VARCHAR(255),
                    avg_loan_tenure FLOAT,
                    loan_collateral VARCHAR(255),
                    loan_income_source VARCHAR(255),
                    interest_rate FLOAT,
                    monthly_payment FLOAT,
                    total_payment FLOAT,
                    total_interest FLOAT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
                cursor.execute(create_table_query)
                connection.commit()

                # Extract loan assessment data from the tracker
                loan_reason = tracker.get_slot("loan_reason")
                loan_amount = tracker.get_slot("loan_amount") or "Not specified"
                loan_tenure = tracker.get_slot("loan_tenure")
                loan_collateral = tracker.get_slot("loan_collateral")
                loan_income_source = tracker.get_slot("loan_income_source")

                # Parse loan amount and calculate average
                if loan_amount == "Not specified":
                    avg_loan_amount = 0  # or some default value
                elif loan_amount == "<50000":
                    avg_loan_amount = 25000
                elif loan_amount == "50000-100000":
                    avg_loan_amount = 75000
                elif loan_amount == "100000-500000":
                    avg_loan_amount = 300000
                elif loan_amount == "500000+":
                    avg_loan_amount = 750000
                else:
                    raise ValueError(f"Invalid loan amount: {loan_amount}")

                # Parse loan tenure and calculate average
                if loan_tenure == "1-3 years":
                    avg_loan_tenure = 2
                elif loan_tenure == "3-5 years":
                    avg_loan_tenure = 4
                elif loan_tenure == "5-10 years":
                    avg_loan_tenure = 7.5
                elif loan_tenure == "10+ years":
                    avg_loan_tenure = 15
                else:
                    raise ValueError(f"Invalid loan tenure: {loan_tenure}")

                # Calculate loan details (simplified example)
                interest_rate = 0.05  # 5% interest rate
                monthly_payment = (avg_loan_amount * (1 + interest_rate) ** avg_loan_tenure) / (avg_loan_tenure * 12)
                total_payment = monthly_payment * avg_loan_tenure * 12
                total_interest = total_payment - avg_loan_amount

                # Calculate loan details
                monthly_principal = avg_loan_amount / (avg_loan_tenure * 12)
                monthly_interest = monthly_payment - monthly_principal

                # Prepare chart data
                chart_data = {
                    'total': {
                        'principal': avg_loan_amount,
                        'interest': total_interest
                    },
                    'monthly': {
                        'principal': monthly_principal,
                        'interest': monthly_interest
                    }
                }

                # Save data to database
                query = """INSERT INTO loan_assessments 
                           (loan_reason, loan_amount, avg_loan_amount, loan_tenure, avg_loan_tenure, 
                            loan_collateral, loan_income_source, interest_rate, monthly_payment, total_payment, total_interest) 
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
                values = (loan_reason, loan_amount, avg_loan_amount, loan_tenure, avg_loan_tenure,
                          loan_collateral, loan_income_source, interest_rate, monthly_payment, total_payment,
                          total_interest)
                cursor.execute(query, values)
                connection.commit()

                # Prepare response
                loan_details = {
                    "loan_reason": loan_reason,
                    "loan_amount": loan_amount,
                    "avg_loan_amount": f"${avg_loan_amount:,.2f}",
                    "loan_tenure": loan_tenure,
                    "avg_loan_tenure": f"{avg_loan_tenure:.1f}",
                    "loan_collateral": loan_collateral,
                    "loan_income_source": loan_income_source,
                    "interest_rate": f"{interest_rate * 100:.2f}%",
                    "monthly_payment": f"${monthly_payment:,.2f}",
                    "total_payment": f"${total_payment:,.2f}",
                    "total_interest": f"${total_interest:,.2f}",
                    "chart_data": chart_data
                }

                time.sleep(3)
                dispatcher.utter_message(text="Your loan assessment is complete. Here are the details:")
                dispatcher.utter_message(json_message={"loan_details": loan_details})

            except Exception as e:
                dispatcher.utter_message(text=f"Failed to save your data due to: {e}")
            finally:
                cursor.close()
                connection.close()
        else:
            dispatcher.utter_message(text="Failed to connect to the database.")

        return []


class ActionShowAdditionalLoanProducts(Action):
    def name(self) -> str:
        return "action_show_additional_loan_products"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        try:
            cursor.execute("SELECT * FROM loan_products")
            loan_products = cursor.fetchall()

            # Create a custom message with loan product cards
            message = {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": []
                }
            }

            for product in loan_products:
                element = {
                    "title": product["name"],
                    "image_url": product["image_url"],
                    "subtitle": product["description"],
                    "default_action": {
                        "type": "web_url",
                        "url": product["apply_link"],
                        "webview_height_ratio": "tall",
                    },
                    "buttons": [{
                        "type": "web_url",
                        "url": product["apply_link"],
                        "title": "Apply Now"
                    }]
                }
                message["payload"]["elements"].append(element)

            # Send the custom message with loan product cards
            time.sleep(3)
            dispatcher.utter_message(attachment=message)

            # This code block has been removed as it is not required

        except mysql.connector.Error as err:
            print(f"Error: {err}")
            dispatcher.utter_message(
                text="Sorry, I couldn't retrieve the loan products at the moment. Please try again later.")

        finally:
            cursor.close()
            connection.close()

        return []


class ValidateLoanAssessmentForm(FormValidationAction):
    def name(self) -> Text:
        return "validate_loan_assessment_form"

    def validate_loan_amount(
            self, value: Text, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict
    ) -> Dict[Text, Any]:
        valid_amounts = ["<50000", "50000-100000", "100000-500000", "500000+"]
        if value in valid_amounts:
            return {"loan_amount": value}
        else:
            dispatcher.utter_message(text="Please select a valid loan amount.")
            return {"loan_amount": None}


class ActionShowCurrencyExchange(Action):
    def name(self) -> Text:
        return "action_show_currency_exchange"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        # Default list of currencies
        default_currencies = ["USD", "EUR", "GBP", "JPY", "SGD", "AUD", "CAD", "CHF", "CNY", "HKD"]

        connection = get_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                # Try to fetch available currencies from the database
                cursor.execute("SELECT currency_code FROM available_currencies")
                currencies = [row['currency_code'] for row in cursor.fetchall()]

                if not currencies:
                    # If no currencies found in the database, use the default list
                    currencies = default_currencies
            except Exception as e:
                # If there's any error (including table not existing), use the default list
                logger.error(f"Error fetching currencies: {e}")
                currencies = default_currencies
            finally:
                cursor.close()
                connection.close()
        else:
            # If database connection fails, use the default list
            currencies = default_currencies

        currency_exchange_ui = {
            "type": "currency_exchange",
            "currencies": currencies,
            "default_from": "USD",
            "default_to": "SGD"
        }

        # time.sleep(3)
        dispatcher.utter_message(text="Here's the currency exchange interface:", custom=currency_exchange_ui)

        return []


class ActionInitiateTransfer(Action):
    def name(self) -> Text:
        return "action_initiate_transfer"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        from_currency = tracker.get_slot('from_currency') or 'USD'
        to_currency = tracker.get_slot('to_currency') or 'SGD'
        amount_str = tracker.get_slot('amount') or '100'
        print(f"came to ActionInitiateTransfer{from_currency},{to_currency},{amount_str}")
        # Check if all required slots are filled
        if not all([from_currency, to_currency, amount_str]):
            missing_slots = []
            if not from_currency:
                missing_slots.append("source currency")
            if not to_currency:
                missing_slots.append("destination currency")
            if not amount_str:
                missing_slots.append("amount")

            dispatcher.utter_message(
                text=f"I'm missing some information. Please provide the {', '.join(missing_slots)}.")
            return []

        # Extract the numeric amount from the string
        try:
            amount = float(amount_str.split()[0])
        except (ValueError, AttributeError, IndexError):
            dispatcher.utter_message(text="I'm sorry, I couldn't understand the amount. Please try again.")
            return []

        connection = get_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                # Fetch from accounts (accounts with the from_currency)
                cursor.execute(
                    "SELECT account_number, account_holder, currency, balance FROM accounts WHERE currency = %s",
                    (from_currency,))
                from_accounts = cursor.fetchall()

                # Fetch to accounts (accounts with the to_currency)
                cursor.execute(
                    "SELECT account_number, account_holder, currency, balance FROM accounts WHERE currency = %s",
                    (to_currency,))
                to_accounts = cursor.fetchall()

                # Simulated exchange rate calculation
                exchange_rate = 1.2  # This should be fetched from a real-time source
                converted_amount = amount * exchange_rate

                print(f"called dispatch message")

                dispatcher.utter_message(json_message={
                    "response_type": "transfer_details",
                    "from_accounts": from_accounts,
                    "to_accounts": to_accounts,
                    "from_amount": f"{from_currency} {amount:.2f}",
                    "to_amount": f"{to_currency} {converted_amount:.2f}",
                    "fee": f"{from_currency} 5.00"
                })

                return []

            except Exception as e:
                dispatcher.utter_message(text=f"Failed to initiate transfer: {e}")
                return []
            finally:
                cursor.close()
                connection.close()
        else:
            dispatcher.utter_message(text="Failed to connect to the database. Please try again later.")
            return []


class ActionSendOTP(Action):
    def name(self) -> Text:
        return "action_send_otp"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        transfer_id = tracker.get_slot('transfer_id')

        print(f"came to action_send_otp with transfer_id -> ", transfer_id)
        connection = get_connection()
        if connection:
            cursor = connection.cursor()
            try:
                # Update transfer status to 'otp_sent'
                update_query = """
                UPDATE currency_transfers
                SET status = 'otp_sent'
                WHERE id = %s
                """
                cursor.execute(update_query, (transfer_id,))
                connection.commit()

                # In a real scenario, you would generate and send an actual OTP here
                # For this example, we'll use a static OTP
                mobile_number = "93880143"

                dispatcher.utter_message(json_message={
                    "response_type": "otp_sent",
                    "message": f"An OTP has been sent to your registered mobile number.",
                    "mobile": mobile_number
                })
            except Exception as e:
                dispatcher.utter_message(text=f"Failed to send OTP due to: {e}")
            finally:
                cursor.close()
                connection.close()
        else:
            dispatcher.utter_message(text="Failed to connect to the database.")

        return []


class ActionVerifyOTP(Action):
    def name(self) -> Text:
        return "action_verify_otp"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        otp = tracker.get_slot('otp')
        transfer_id = tracker.get_slot('transfer_id')

        connection = get_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                # In a real scenario, you would verify the OTP against a stored value
                # For this example, we'll use a static OTP
                if otp:  # Accept any non-empty OTP
                    # Update transfer status to 'completed'
                    # Simulating a successful transfer without database interaction
                    transfer = {
                        'id': transfer_id,
                        'from_account': '1234567890',
                        'to_account': '0987654321',
                        'from_currency': 'SGD',
                        'to_currency': 'AUD',
                        'amount': 1000.00
                    }

                    if transfer:
                        time.sleep(3)
                        dispatcher.utter_message(json_message={
                            "response_type": "transfer_success",
                            "transfer_details": {
                                "from_account": transfer['from_account'],
                                "to_account": transfer['to_account'],
                                "from_amount": f"{transfer['from_currency']} {transfer['amount']:.2f}",
                                "to_amount": f"{transfer['to_currency']} {transfer['amount'] * 1.2:.2f}",
                                # Simulated exchange rate
                                "fee": f"{transfer['from_currency']} 5.00"
                            }
                        })
                        return [SlotSet("transfer_completed", True)]
                    else:
                        dispatcher.utter_message(text="Transfer details not found.")
                else:
                    # Update transfer status to 'failed'
                    update_query = """
                    UPDATE currency_transfers
                    SET status = 'failed'
                    WHERE id = %s
                    """
                    cursor.execute(update_query, (transfer_id,))
                    connection.commit()

                    dispatcher.utter_message(text="Invalid OTP. Please try again.")
            except Exception as e:
                dispatcher.utter_message(text=f"Failed to verify OTP due to: {e}")
            finally:
                cursor.close()
                connection.close()
        else:
            dispatcher.utter_message(text="Failed to connect to the database.")

        return []


class ActionShowBlockCardSection(Action):
    def name(self) -> str:
        return "action_show_block_card_section"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[str, Any]) -> List[Dict[str, Any]]:
        dispatcher.utter_message(text="Navigating to the block cards section...")
        dispatcher.utter_message(custom={"event": "showBlockCardSection"})
        return []


class ActionShowLocationsCard(Action):
    def name(self) -> str:
        return "action_show_locations_card"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[str, Any]) -> List[Dict[str, Any]]:
        dispatcher.utter_message(text="Please select a branch location:")
        dispatcher.utter_message(custom={"event": "showLocationsCard"})
        print("called ActionShowLocationsCard")
        return []


class ActionShowScheduleCard(Action):
    def name(self) -> str:
        return "action_show_schedule_card"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[str, Any]) -> List[Dict[str, Any]]:
        selected_branch = tracker.get_slot('branch')
        time.sleep(4)
        dispatcher.utter_message(custom={"event": "showScheduleCard", "branch": selected_branch})
        print("called ActionShowScheduleCard")
        return []


class ActionShowConfirmationCard(Action):
    def name(self) -> str:
        return "action_show_confirmation_card"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[str, Any]) -> List[Dict[str, Any]]:
        schedule_details = tracker.get_slot('schedule_details')
        time.sleep(5)
        dispatcher.utter_message(custom={"event": "showConfirmationCard", "details": schedule_details})
        print("called ActionShowConfirmationCard")
        return []
