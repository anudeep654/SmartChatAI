document.addEventListener("DOMContentLoaded", function () {
  // Account Overview Chart
  var ctx = document.getElementById("accountOverviewChart").getContext("2d");
  var accountOverviewChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [
        "Groceries",
        "Transportation",
        "Entertainment",
        "Bills",
        "Others",
      ],
      datasets: [
        {
          data: [30, 15, 10, 25, 20],
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        position: "bottom",
      },
    },
  });

  // Chat functionality
  const chatIcon = document.getElementById("chat-icon");
  const chatWindow = document.getElementById("chatbot");
  const chatBody = document.getElementById("chat-body");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-message");

  if (chatIcon && chatWindow) {
    chatIcon.addEventListener("click", function () {
      if (
        chatWindow.style.display === "none" ||
        chatWindow.style.display === ""
      ) {
        chatWindow.style.display = "flex";
        chatWindow.style.opacity = "0";
        setTimeout(() => {
          chatWindow.style.opacity = "1";
        }, 50);
      } else {
        chatWindow.style.opacity = "0";
        setTimeout(() => {
          chatWindow.style.display = "none";
        }, 300);
      }
    });
  }

  function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function addMessage(message, isUser) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add(
      "chat-message",
      isUser ? "user-message" : "bot-message"
    );

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.textContent = isUser ? "U" : "B";

    const messageContent = document.createElement("span");
    messageContent.innerHTML = message; // Use innerHTML to render HTML tags

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);

    chatBody.appendChild(messageDiv);
    scrollToBottom();
  }

  const switchServiceIcon = document.getElementById("switch-service-icon");

  switchServiceIcon.addEventListener("click", function () {
    sendMessage("switch service", true);
  });

  function sendMessage(
    message = null,
    isButtonClick = false,
    skipAddMessage = false
  ) {
    const userMessage = message || userInput.value.trim();
    if (userMessage) {
      if (!isButtonClick && !skipAddMessage) {
        addMessage(userMessage, true);
      }
      userInput.value = "";

      const typingIndicator = showTypingIndicator();

      // Make API call to Rasa
      fetch("/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      })
        .then((response) => response.json())
        .then((data) => {
          // Remove typing indicator
          chatBody.removeChild(typingIndicator);

          // Handle text response
          if (data.text) {
            addMessage(data.text, false);
          }

          if (data.custom) {
            handleCustomResponse(data.custom);
          }

          // Handle loan assessment results
          if (data.custom && data.custom.loan_details) {
            const loanDetails = data.custom.loan_details;

            // Format loan reason and income source
            const formatText = (text) =>
              text
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
            const formattedLoanReason = formatText(loanDetails.loan_reason);
            const formattedIncomeSource = formatText(
              loanDetails.loan_income_source
            );

            addMessage(
              "Your loan assessment is complete. Here are the details:",
              false
            );

            const loanResultsHtml = `
                        <div class="glassy-card loan-results-card">
                            <div class="card-header">
                                <i class="fas fa-check-circle"></i>
                                <h3 class="card-title">Congratulations! Your Loan is Pre-Approved</h3>
                            </div>
                            <div class="card-content">
                                <div class="loan-calculation">
                                    <div class="calculation-item highlight">
                                        <i class="fas fa-home"></i>
                                        <span class="calculation-label">Loan Reason:</span>
                                        <span class="calculation-value">${formattedLoanReason}</span>
                                    </div>
                                    <div class="calculation-item highlight">
                                        <i class="fas fa-dollar-sign"></i>
                                        <span class="calculation-label">Loan Amount:</span>
                                        <span class="calculation-value">${loanDetails.loan_amount}</span>
                                    </div>
                                    <div class="calculation-item">
                                        <i class="fas fa-calendar-alt"></i>
                                        <span class="calculation-label">Loan Tenure:</span>
                                        <span class="calculation-value">${loanDetails.loan_tenure}</span>
                                    </div>
                                    <div class="calculation-item">
                                        <i class="fas fa-piggy-bank"></i>
                                        <span class="calculation-label">Total Interest:</span>
                                        <span class="calculation-value">${loanDetails.total_interest}</span>
                                    </div>
                                    <div class="calculation-item highlight">
                                        <i class="fas fa-percentage"></i>
                                        <span class="calculation-label">Interest Rate:</span>
                                        <span class="calculation-value">${loanDetails.interest_rate}</span>
                                    </div>
                                    <div class="calculation-item highlight">
                                        <i class="fas fa-money-bill-wave"></i>
                                        <span class="calculation-label">Monthly Payment:</span>
                                        <span class="calculation-value">${loanDetails.monthly_payment}</span>
                                    </div>
                                    <div class="calculation-item">
                                        <i class="fas fa-coins"></i>
                                        <span class="calculation-label">Total Payment:</span>
                                        <span class="calculation-value">${loanDetails.total_payment}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="confetti-container"></div>
                        </div>
                    `;
            const botMessageDiv = document.createElement("div");
            botMessageDiv.classList.add("message", "bot-message");
            botMessageDiv.innerHTML = loanResultsHtml;
            chatBody.appendChild(botMessageDiv);

            // Add animation to the loan results card and create confetti
            setTimeout(() => {
              const loanResultsCard =
                botMessageDiv.querySelector(".loan-results-card");
              loanResultsCard.classList.add("show");
              createConfetti(
                loanResultsCard.querySelector(".confetti-container")
              );
            }, 100);
          }

          if (data.custom && data.custom.event === "showBlockCardSection") {
            const event = new Event("showBlockCardSection");
            document.dispatchEvent(event);
          }

          // Handle attachments (loan product carousel)
          if (data.attachments && data.attachments.length > 0) {
            const attachment = data.attachments[0];
            if (
              attachment.type === "template" &&
              attachment.payload.template_type === "generic"
            ) {
              const elements = attachment.payload.elements;
              const carouselContainer = document.createElement("div");
              carouselContainer.classList.add("loan-product-carousel");

              const loadImages = elements.map((element) => {
                return new Promise((resolve) => {
                  const img = new Image();
                  img.onload = () => resolve();
                  img.onerror = () => resolve(); // Resolve even if image fails to load
                  img.src = element.image_url;
                });
              });

              Promise.all(loadImages).then(() => {
                elements.forEach((element) => {
                  const card = document.createElement("div");
                  card.classList.add("loan-product-card");
                  card.innerHTML = `
                    <img src="${element.image_url}" alt="${element.title}">
                    <h3>${element.title}</h3>
                    <p>${element.subtitle}</p>
                    <a href="${element.default_action.url}" target="_blank" class="apply-button">Apply Now</a>
                  `;
                  carouselContainer.appendChild(card);
                });

                const botMessageDiv = document.createElement("div");
                botMessageDiv.classList.add("message", "bot-message");
                botMessageDiv.appendChild(carouselContainer);
                chatBody.appendChild(botMessageDiv);

                // Use setTimeout to ensure the DOM has updated before scrolling
                setTimeout(() => {
                  scrollToBottom();
                }, 100);
              });
            }
          }

          // Handle custom events
          if (data.custom && data.custom.event === "showLocationsCard") {
            const event = new CustomEvent("showLocationsCard");
            document.dispatchEvent(event);
          }

          if (data.custom && data.custom.event === "showScheduleCard") {
            const event = new CustomEvent("showScheduleCard", {
              detail: { branch: data.custom.branch },
            });
            document.dispatchEvent(event);
          }

          if (data.custom && data.custom.event === "showConfirmationCard") {
            const event = new CustomEvent("showConfirmationCard", {
              detail: { details: data.custom.details },
            });
            document.dispatchEvent(event);
          }

          // Handle buttons if present
          if (data.buttons && data.buttons.length > 0) {
            const buttonsDiv = document.createElement("div");
            buttonsDiv.classList.add("chat-buttons");
            data.buttons.forEach((button) => {
              const buttonElement = document.createElement("button");
              buttonElement.textContent = button.title;
              buttonElement.addEventListener("click", function (e) {
                e.preventDefault(); // Prevent default button behavior
                sendMessage(button.payload, true);
              });
              buttonsDiv.appendChild(buttonElement);
            });
            chatBody.appendChild(buttonsDiv);
            scrollToBottom();
          }

          // Handle attachments if present
          if (data.attachments && data.attachments.length > 0) {
            data.attachments.forEach((attachment) => {
              if (attachment.type === "file") {
                const fileLink = document.createElement("a");
                fileLink.href = attachment.payload.url;
                fileLink.textContent = attachment.payload.title;
                fileLink.download = attachment.payload.title;
                chatBody.appendChild(fileLink);
              } else if (attachment.type === "html") {
                const htmlContent = document.createElement("div");
                htmlContent.innerHTML = attachment.payload.html_content;
                chatBody.appendChild(htmlContent);
              }
            });
            scrollToBottom();
          }

          // Handle custom responses (cards, investments, etc.)
          if (data.custom) {
            const botCustom = data.custom;

            if (
              botCustom &&
              botCustom.form_name === "financial_planning_form"
            ) {
              console.log("Initializing financial planning form");

              const formContainer = document.createElement("div");
              formContainer.className = "message bot-message";

              const formContent = document.createElement("div");
              formContent.className = "investment-form-content";

              const form = document.createElement("form");
              form.id = "investment-form";

              const fields = [
                {
                  id: "investment-amount",
                  label: "Investment Amount per month:",
                  name: "starting_amount",
                  options: [
                    "500",
                    "800",
                    "1000",
                    "1500",
                    "2000",
                    "2500",
                    "3000",
                    "5000",
                    "10000",
                    "50000",
                  ],
                },
                {
                  id: "investment-duration",
                  label: "Duration (Years):",
                  name: "duration",
                  options: ["1", "3", "5", "10", "20"],
                },
                {
                  id: "investment-return",
                  label: "Return Rate (%):",
                  name: "return_rate",
                  options: ["2", "5", "7", "10", "12"],
                },
                {
                  id: "investment-compound",
                  label: "Compound Frequency:",
                  name: "compound_frequency",
                  options: [
                    "annually",
                    "semi_annually",
                    "quarterly",
                    "monthly",
                  ],
                },
              ];

              fields.forEach((field) => {
                const label = document.createElement("label");
                label.htmlFor = field.id;
                label.className = "investment-label";
                label.textContent = field.label;
                form.appendChild(label);

                const select = document.createElement("select");
                select.id = field.id;
                select.className = "investment-input";
                select.name = field.name;
                select.required = true;

                field.options.forEach((optionValue) => {
                  const option = document.createElement("option");
                  option.value = optionValue;
                  option.textContent =
                    field.name === "compound_frequency"
                      ? optionValue.replace("_", "-")
                      : optionValue;
                  select.appendChild(option);
                });

                form.appendChild(select);
              });

              const submitButton = document.createElement("input");
              submitButton.type = "submit";
              submitButton.value = "Submit";
              submitButton.className = "investment-submit";
              form.appendChild(submitButton);

              formContent.appendChild(form);
              formContainer.appendChild(formContent);
              chatBody.appendChild(formContainer);
              scrollToBottom();

              console.log("Form added to DOM");

              // Add event listener for form submission
              form.addEventListener("submit", function (e) {
                console.log("Form submit event triggered");
                e.preventDefault();

                const formData = new FormData(form);

                console.log("Collected form data:");
                for (let [key, value] of formData.entries()) {
                  console.log(`${key}: ${value}`);
                }

                // Check if formData is empty
                if ([...formData.entries()].length === 0) {
                  console.error("Form data is empty");
                  return;
                }

                // Create an object from FormData for easier manipulation
                const formDataObj = Object.fromEntries(formData.entries());
                console.log("Form data object:", formDataObj);

                // Validate form data
                for (let key in formDataObj) {
                  if (!formDataObj[key]) {
                    console.error(`Missing value for ${key}`);
                    return;
                  }
                }

                console.log("Form data is valid. Submitting...");
                submitFinancialPlanningForm(formDataObj);
              });
            }

            if (botCustom.investments) {
              const investmentContainer = document.createElement("div");
              investmentContainer.classList.add("investment-carousel");

              botCustom.investments.forEach(function (investment, index) {
                const investmentCard = document.createElement("div");
                investmentCard.classList.add("investment-card", "glassy-card");
                investmentCard.style.animationDelay = `${index * 0.1}s`;

                investmentCard.innerHTML = `
                      <div class="investment-icon">
                          <i class="fas fa-chart-line"></i>
                      </div>
                      <h3 class="investment-name">${investment.name}</h3>
                      <p class="investment-description">${investment.description}</p>
                      <div class="investment-details">
                          <div class="detail-item">
                              <i class="fas fa-box"></i>
                              <span>Package: ${investment.packages}</span>
                          </div>
                          <div class="detail-item">
                              <i class="fas fa-calendar-alt"></i>
                              <span>Monthly: ${investment.monthly_payment}</span>
                          </div>
                          <div class="detail-item highlight">
                              <i class="fas fa-percentage"></i>
                              <span>Return: ${investment.returns}</span>
                          </div>
                      </div>
                      <a href="${investment.link}" class="investment-link" target="_blank">
                          Learn More
                          <i class="fas fa-arrow-right"></i>
                      </a>
                  `;

                investmentContainer.appendChild(investmentCard);
              });

              const botMessageDiv = document.createElement("div");
              botMessageDiv.classList.add("message", "bot-message");
              botMessageDiv.appendChild(investmentContainer);
              chatBody.appendChild(botMessageDiv);
              scrollToBottom();
            }
            if (botCustom.cards) {
              const cardsContainer = document.createElement("div");
              cardsContainer.classList.add("cards-container");

              let cardsHtml = '<div class="cards-carousel">';
              botCustom.cards.forEach((card, index) => {
                const cardType = card.card_name.toLowerCase().includes("visa")
                  ? "visa"
                  : "mastercard";
                const cardColor =
                  index % 3 === 0
                    ? "blue"
                    : index % 3 === 1
                    ? "gold"
                    : "platinum";
                cardsHtml += `
                        <a href="${
                          card.apply_link
                        }" class="credit-card ${cardType} ${cardColor}" target="_blank" style="--delay: ${
                  index * 0.1
                }s;">
                            <div class="card-background"></div>
                            <div class="card-content">
                                <div class="card-top">
                                    <div class="card-logo">Dummy Bank</div>
                                    <div class="card-chip"></div>
                                </div>
                                <div class="card-number">${formatCardNumber(
                                  card.card_number
                                )}</div>
                                <div class="card-info">
                                    <div class="card-holder">
                                        <div class="label">Card Holder</div>
                                        <div class="value">${
                                          card.card_holder_name
                                        }</div>
                                    </div>
                                    <div class="card-expires">
                                        <div class="label">Expires</div>
                                        <div class="value">12/25</div>
                                    </div>
                                </div>
                                <div class="card-type-logo">${cardType.toUpperCase()}</div>
                            </div>
                        </a>`;
              });
              cardsHtml += "</div>";

              cardsContainer.innerHTML = cardsHtml;
              chatBody.appendChild(cardsContainer);
              scrollToBottom();
            }

            function formatCardNumber(number) {
              return number.replace(/(\d{4})/g, "$1 ").trim();
            }

            if (botCustom.html_content) {
              const htmlContainer = document.createElement("div");
              htmlContainer.innerHTML = botCustom.html_content;
              chatBody.appendChild(htmlContainer);
              scrollToBottom();
            }
          }

          scrollToBottom();
        })
        .catch((error) => {
          console.error("Error:", error);
          chatBody.removeChild(typingIndicator);
          addMessage(
            "Sorry, there was an error processing your request.",
            false
          );
        });
    }
  }

  function handleCustomResponse(customData) {
    if (customData.type === "currency_exchange") {
      handleCurrencyExchange(customData);
    } else if (customData.response_type === "transfer_details") {
      handleTransferDetails(customData);
    } else if (customData.response_type === "otp_sent") {
      handleOtpSent(customData);
    } else if (customData.response_type === "transfer_success") {
      handleTransferSuccess(customData.transfer_details);
    }
  }

  function handleCurrencyExchange(customData) {
    const currencyExchangeCard = document.createElement("div");
    currencyExchangeCard.className = "currency-exchange-card glass-effect";
    currencyExchangeCard.innerHTML = `
      <h3>Currency Exchange</h3>
      <div class="exchange-row">
        <div class="exchange-column">
          <label for="from-currency">From</label>
          <select id="from-currency" class="form-control">
            ${customData.currencies
              .map(
                (currency) =>
                  `<option value="${currency}" ${
                    currency === "SGD" ? "selected" : ""
                  }>${currency}</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="exchange-column">
          <label for="to-currency">To</label>
          <select id="to-currency" class="form-control">
            ${customData.currencies
              .map(
                (currency) =>
                  `<option value="${currency}" ${
                    currency === "INR" ? "selected" : ""
                  }>${currency}</option>`
              )
              .join("")}
          </select>
        </div>
      </div>
      <div class="exchange-row">
        <div class="exchange-column">
          <label for="amount">Amount</label>
          <input type="number" id="amount" class="form-control" min="0" step="0.01" value="1000">
        </div>
        <div class="exchange-column">
          <label for="rate">Rate</label>
          <input type="number" id="rate" class="form-control" min="0" step="0.0001" readonly>
        </div>
      </div>
      <div class="exchange-row">
        <div class="exchange-column wide">
          <label for="result">Result</label>
          <input type="text" id="result" class="form-control" readonly>
        </div>
      </div>
      <div class="exchange-info">
        <div class="info-item">
          <span class="info-label">Exchange Rate:</span>
          <span class="info-value" id="exchange-rate">-</span>
        </div>
        <div class="info-item">
          <span class="info-label">Converted Amount:</span>
          <span class="info-value" id="converted-amount">-</span>
        </div>
      </div>
      <div class="card-action">
        <button class="exchange-button" onclick="initiateTransfer()">Transfer</button>
      </div>
    `;
    chatBody.appendChild(currencyExchangeCard);
    scrollToBottom();

    // Set up event listeners and initial exchange rate calculation
    const fromCurrency = currencyExchangeCard.querySelector("#from-currency");
    const toCurrency = currencyExchangeCard.querySelector("#to-currency");
    const amount = currencyExchangeCard.querySelector("#amount");
    const rate = currencyExchangeCard.querySelector("#rate");
    const result = currencyExchangeCard.querySelector("#result");

    // Update for real-time changes
    fromCurrency.addEventListener("change", () =>
      updateExchangeRate(fromCurrency, toCurrency, amount, rate, result)
    );
    toCurrency.addEventListener("change", () =>
      updateExchangeRate(fromCurrency, toCurrency, amount, rate, result)
    );
    amount.addEventListener("input", () =>
      updateExchangeRate(fromCurrency, toCurrency, amount, rate, result)
    );

    // Initial update
    updateExchangeRate(fromCurrency, toCurrency, amount, rate, result);
  }

  function updateExchangeRate(fromCurrency, toCurrency, amount, rate, result) {
    // This function would typically call an API to get the latest exchange rate
    // For this example, we'll use a mock rate
    const mockRate = 1.2; // This should be fetched from an API in a real scenario
    const convertedAmount = parseFloat(amount.value) * mockRate;

    rate.value = mockRate.toFixed(4);
    result.value = `${convertedAmount.toFixed(2)} ${toCurrency.value}`;

    // Update the exchange info section
    document.getElementById("exchange-rate").textContent = `1 ${
      fromCurrency.value
    } = ${mockRate.toFixed(4)} ${toCurrency.value}`;
    document.getElementById(
      "converted-amount"
    ).textContent = `${convertedAmount.toFixed(2)} ${toCurrency.value}`;
  }

  function initiateTransfer() {
    const currencyExchangeCard = document.querySelector(
      ".currency-exchange-card"
    );
    if (!currencyExchangeCard) {
      console.error("Currency exchange card not found");
      return;
    }

    const fromCurrency =
      currencyExchangeCard.querySelector("#from-currency").value;
    const toCurrency = currencyExchangeCard.querySelector("#to-currency").value;
    const amountInput = currencyExchangeCard.querySelector("#amount");
    const amount = amountInput.value.trim();

    // Check if amount is empty or not a number
    if (!amount || isNaN(parseFloat(amount))) {
      alert("Please enter a valid amount.");
      amountInput.focus();
      return;
    }

    // Construct a message string
    const message = `I want to transfer ${amount} ${fromCurrency} to ${toCurrency}`;

    // Send the message
    sendMessage(message, false, true);
  }
  function handleTransferDetails(customData) {
    const transferDetailsCard = document.createElement("div");
    transferDetailsCard.className = "transfer-details-card glass-effect";

    const defaultFromAccount = customData.from_accounts[0];
    const toAccountOptions = customData.to_accounts
      .map(
        (account) =>
          `<option value="${account.account_number}">${account.account_holder} - ${account.account_number}</option>`
      )
      .join("");

    transferDetailsCard.innerHTML = `
      <h3>Transfer Details</h3>
      <div class="form-group">
        <label for="from-account">From Account</label>
        <input type="text" id="from-account" class="form-control" value="${defaultFromAccount.account_holder} - ${defaultFromAccount.account_number}" disabled>
      </div>
      <div class="form-group">
        <label for="to-account">To Account</label>
        <select id="to-account" class="form-control">
          <option value="">Select an account</option>
          ${toAccountOptions}
        </select>
      </div>
      <div class="transfer-info">
        <div class="info-item">
          <span class="info-label">Amount:</span>
          <span class="info-value">${customData.from_amount}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Converted Amount:</span>
          <span class="info-value">${customData.to_amount}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Fee:</span>
          <span class="info-value">${customData.fee}</span>
        </div>
      </div>
      <div class="card-action">
        <button class="confirm-button" onclick="confirmTransfer()">Confirm Transfer</button>
      </div>
    `;
    chatBody.appendChild(transferDetailsCard);
    scrollToBottom();
  }

  function confirmTransfer() {
    const fromAccount = document.getElementById("from-account").value || "";
    const toAccount =
      document.getElementById("to-account").value || "Eva White - 1234567890";
    const amount = document.getElementById("amount").value || "1000";
    const fromCurrency =
      document.getElementById("from-currency").value || "USD";
    const toCurrency = document.getElementById("to-currency").value || "USD";

    // Check if all required fields are filled
    if (!fromAccount || !toAccount || !amount || !fromCurrency || !toCurrency) {
      let missingFields = [];
      if (!fromAccount) missingFields.push("source account");
      if (!toAccount) missingFields.push("destination account");
      if (!amount) missingFields.push("amount");
      if (!fromCurrency) missingFields.push("source currency");
      if (!toCurrency) missingFields.push("destination currency");

      alert(`Please select/enter ${missingFields.join(", ")}.`);
      return;
    }

    // If all fields are filled, proceed with the transfer
    sendMessage(
      `Confirm transfer of ${amount} ${fromCurrency} from ${fromAccount} to ${toAccount} in ${toCurrency}`,
      false,
      true
    );
  }

  function handleOtpSent(customData) {
    const otpCard = document.createElement("div");
    otpCard.className = "otp-card glass-effect";

    const maskedMobile = customData.mobile.replace(/\d(?=\d{4})/g, "*");

    otpCard.innerHTML = `
      <h3>OTP Verification</h3>
      <div class="tab-container">
        <button class="tab-button active" data-tab="sms">SMS OTP</button>
        <button class="tab-button" data-tab="token">Soft Token</button>
      </div>
      <div class="tab-content active" id="sms-tab">
        <p>Enter the 6-digit code sent to your mobile</p>
      <div class="otp-input-container">
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
      </div>
        <p class="mobile-number">Mobile: ${maskedMobile}</p>
        <p class="timer">Resend OTP in: <span id="countdown">60</span> seconds</p>
        <button class="resend-button" disabled>Resend OTP</button>
      </div>
      <div class="tab-content" id="token-tab">
        <p>Enter the 6-digit code from your Soft Token app</p>
      <div class="otp-input-container">
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
        <input type="text" maxlength="1" class="otp-input" autocomplete="off" inputmode="numeric" pattern="[0-9]*" />
      </div>
      </div>
      <div class="card-action">
        <button class="verify-button" onclick="verifyOtp()">Verify OTP</button>
      </div>
    `;

    chatBody.appendChild(otpCard);
    scrollToBottom();

    // Set up tab switching
    const tabButtons = otpCard.querySelectorAll(".tab-button");
    const tabContents = otpCard.querySelectorAll(".tab-content");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));
        button.classList.add("active");
        otpCard
          .querySelector(`#${button.dataset.tab}-tab`)
          .classList.add("active");
      });
    });

    // Set up OTP input behavior
    const otpInputs = otpCard.querySelectorAll(".otp-input");
    otpInputs.forEach((input, index) => {
      input.addEventListener("input", (e) => {
        if (e.target.value) {
          if (index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
          }
        }
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !e.target.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      });
    });

    // Set up resend button and timer
    const resendButton = otpCard.querySelector(".resend-button");
    const countdownElement = otpCard.querySelector("#countdown");
    let countdown = 60;

    function updateTimer() {
      countdown--;
      countdownElement.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(timerInterval);
        resendButton.disabled = false;
        otpCard.querySelector(".timer").style.display = "none";
      }
    }

    let timerInterval = setInterval(updateTimer, 1000);

    resendButton.addEventListener("click", () => {
      sendMessage("Resend OTP");
      resendButton.disabled = true;
      countdown = 60;
      countdownElement.textContent = countdown;
      otpCard.querySelector(".timer").style.display = "block";
      timerInterval = setInterval(updateTimer, 1000);
    });
  }

  function verifyOtp() {
    const activeTab = document.querySelector(".tab-content.active");
    const otpInputs = activeTab.querySelectorAll(".otp-input");
    const otp = Array.from(otpInputs)
      .map((input) => input.value)
      .join("");

    if (otp.length !== 6) {
      alert("Please enter a 6-digit OTP");
      return;
    }

    // Add your OTP verification logic here
    sendMessage(`Verify OTP: ${otp}`, false, true);
  }

  function handleTransferSuccess(customData) {
    const successCard = document.createElement("div");
    successCard.className = "success-card glass-effect";
    successCard.innerHTML = `
          <div class="success-header">
            <i class="fas fa-check-circle"></i>
            <h3>Transfer Successful!</h3>
          </div>
          <div class="transfer-details">
                  <div class="info-item">
          <span class="info-label">Transaction ID:</span>
          <span class="info-value">DummyBank1234567890</span>
        </div>
            <div class="info-item">
              <span class="info-label"><i class="fas fa-wallet"></i> From Account:</span>
              <span class="info-value">${customData.from_account}</span>
            </div>
            <div class="info-item">
              <span class="info-label"><i class="fas fa-user"></i> To Account:</span>
              <span class="info-value">${customData.to_account}</span>
            </div>
            <div class="info-item">
              <span class="info-label"><i class="fas fa-money-bill-wave"></i> Amount:</span>
              <span class="info-value">${customData.from_amount}</span>
            </div>
            <div class="info-item">
              <span class="info-label"><i class="fas fa-exchange-alt"></i> Converted Amount:</span>
              <span class="info-value">${customData.to_amount}</span>
            </div>
            <div class="info-item">
              <span class="info-label"><i class="fas fa-receipt"></i> Fee:</span>
              <span class="info-value">${customData.fee}</span>
            </div>
          </div>
          <div class="success-footer">
            <p>Your transfer has been processed successfully.</p>
          </div>
        `;
    chatBody.appendChild(successCard);
    scrollToBottom();
    // createConfetti(chatBody);
    setTimeout(() => {
      successCard.classList.add("show");
    }, 100);
  }

  function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.classList.add("chat-message", "bot-message", "typing-indicator");

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.textContent = "B";

    const dotsContainer = document.createElement("div");
    dotsContainer.classList.add("dots");
    dotsContainer.style.display = "flex";
    dotsContainer.style.alignItems = "center";
    dotsContainer.style.padding = "0 5px";

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("div");
      dot.classList.add("dot");
      dot.style.width = "7px";
      dot.style.height = "7px";
      dot.style.borderRadius = "50%";
      dot.style.backgroundColor = "#003b5c";
      dot.style.margin = "0 1px";
      dot.style.opacity = "0";
      dot.style.animation = "typingAnimation 1.4s infinite";
      dot.style.animationDelay = `${i * 0.2}s`;
      dotsContainer.appendChild(dot);
    }

    typingDiv.appendChild(avatar);
    typingDiv.appendChild(dotsContainer);

    chatBody.appendChild(typingDiv);
    scrollToBottom();
    return typingDiv;
  }

  // Make functions globally accessible
  window.initiateTransfer = initiateTransfer;
  window.confirmTransfer = confirmTransfer;
  window.verifyOtp = verifyOtp;
  window.updateExchangeRate = updateExchangeRate;

  // Add this function outside the sendMessage function
  function submitFinancialPlanningForm(formData) {
    const data = formData;
    scrollToBottom();

    // Show "bot is typing..." message with animated dots
    const typingIndicator = showTypingIndicator();

    // Send the form data to the webhook
    fetch("/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sender: "user", message: data }),
    })
      .then((response) => response.json())
      .then((response) => {
        // Remove typing indicator
        chatBody.removeChild(typingIndicator);

        let botInvestmentOptions = response.custom
          ? response.custom.investments
          : [];

          botInvestmentOptions = [
            {
              name: "Mutual Fund A",
              description: "High returns with a diversified portfolio.",
              packages: "Basic, Premium",
              monthly_payment: "$100 - $500",
              returns: "3-5%",
              link: "https://www.dummybankam.com.sg/dummybankam/our-funds/funds-details.page?mstarid=F00000SK7B"
            },
            {
              name: "Bond B",
              description: "Moderate risk with balanced growth potential",
              packages: "Standard, Elite",
              monthly_payment: "$200 - $1000",
              returns: "5-8%",
              link: "https://www.dummybankam.com.sg/our-funds/funds-details.page?"
            },
            {
              name: "Gold Investment",
              description: "High-risk, high-reward investment strategy",
              returns: "8-12%",
              packages: "Basic, Gold Plus",
              monthly_payment: "$50 - $300",
              link: "https://www.dummybankam.com.sg/our-funds/funds-details.page?"
            },
            {
              name: "Index Fund C",
              description: "Invest in a broad market index for steady growth.",
              returns: "10-15%",
              packages: "Standard, Growth",
              monthly_payment: "$150 - $700",
              link: "https://www.dummybankam.com.sg/dummybankam/our-funds/funds-details.page?mstarid=F00000SK7B"
            }
          ];

        // Populate investment carousel
        if (botInvestmentOptions && botInvestmentOptions.length > 0) {
          const investmentContainer = document.createElement("div");
          investmentContainer.classList.add("investment-carousel");

          botInvestmentOptions.forEach(function (investment) {
            const investmentCard = document.createElement("div");
            investmentCard.classList.add("investment-card");
            investmentCard.innerHTML = `
                        <div class="investment-name">${investment.name}</div>
                        <div class="investment-details description">${investment.description}</div>
                        <div class="investment-details package">Package: ${investment.packages}</div>
                        <div class="investment-details monthly">Monthly: ${investment.monthly_payment}</div>
                        <div class="investment-return">Return: ${investment.returns}</div>
                        <a href="${investment.link}" class="investment-link" target="_blank">Learn More</a>
                    `;
            investmentContainer.appendChild(investmentCard);
          });

          const botMessageDiv = document.createElement("div");
          botMessageDiv.classList.add("message", "bot-message");
          botMessageDiv.appendChild(investmentContainer);

          chatBody.appendChild(botMessageDiv);
          scrollToBottom();
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        addMessage(
          "There was an error processing your financial planning information. Please try again later.",
          false
        );
      });
  }

  sendButton.addEventListener("click", () => sendMessage());
  userInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  const cardsMenuItem = document.getElementById("cards-menu");
  const cardsSubMenu = document.getElementById("cards-sub-menu");

  cardsMenuItem.addEventListener("click", function () {
    if (cardsSubMenu.style.display === "block") {
      cardsSubMenu.style.display = "none";
    } else {
      cardsSubMenu.style.display = "block";
    }
  });

  function showBlockCardSection() {
    // Simulate clicking on the "Cards" menu item
    cardsMenuItem.click();

    // Highlight the "Cards" menu item
    cardsMenuItem.classList.add("highlight");
    setTimeout(() => cardsMenuItem.classList.remove("highlight"), 10000);

    // Simulate clicking on the "Block Cards" submenu item
    setTimeout(() => {
      const blockCardsSubMenuItem = Array.from(
        document.querySelectorAll(".mdl-navigation__sub-menu a")
      ).find((el) => el.textContent.includes("Block Cards"));
      blockCardsSubMenuItem.click();

      // Highlight the "Block Cards" submenu item
      blockCardsSubMenuItem.classList.add("highlight");
      setTimeout(
        () => blockCardsSubMenuItem.classList.remove("highlight"),
        10000
      );
    }, 1000);
  }

  document.addEventListener("showBlockCardSection", showBlockCardSection);

  // Function to show branch locations on map
  function showLocationsCard() {
    const branches = [
      { name: "Branch 1 - Orchard Road", lat: 1.3048, lng: 103.8318 },
      { name: "Branch 2 - Raffles Place", lat: 1.2833, lng: 103.8515 },
      { name: "Branch 3 - Marina Bay", lat: 1.2806, lng: 103.8572 },
      { name: "Branch 4 - Bugis", lat: 1.3, lng: 103.8565 },
      { name: "Branch 5 - Jurong East", lat: 1.3331, lng: 103.743 },
      { name: "Branch 6 - Tampines", lat: 1.3541, lng: 103.9457 },
      { name: "Branch 7 - Woodlands", lat: 1.436, lng: 103.7865 },
      { name: "Branch 8 - Changi", lat: 1.3644, lng: 103.9915 },
      { name: "Branch 9 - Sentosa", lat: 1.2494, lng: 103.8303 },
    ];

    const mapHtml = '<div id="map" style="height: 400px; width: 100%;"></div>';
    chatBody
      .appendChild(document.createElement("div"))
      .classList.add("message", "bot-map");
    chatBody.lastChild.innerHTML = mapHtml;

    const map = L.map("map").setView([1.3521, 103.8198], 11); // Centered on Singapore

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    branches.forEach((branch) => {
      const marker = L.marker([branch.lat, branch.lng]).addTo(map);
      const popupContent = `
        <div class="branch-popup">
          <b>${branch.name}</b><br>
          <button class="select-branch-btn" onclick="selectBranch('${branch.name}')">Select</button>
        </div>
      `;
      marker.bindPopup(popupContent).openPopup();
    });

    // Add zoom control
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(map);
  }

  // Make selectBranch function globally accessible
  window.selectBranch = function (branchName) {
    // Send the branch name to Rasa
    sendMessage(branchName, true);
  };

  // Function to show schedule card
  function showScheduleCard(branch) {
    const scheduleHtml = `
      <div class="schedule-card transferDetailsCard">
        <h3 class="schedule-title" style="margin-top: 0px;">Please select Date & Time</h3>
        <div id="flatpickr-date" class="flatpickr" style="visibility: hidden;"></div>
        <div id="flatpickr-time" class="flatpickr" style="visibility: hidden;"></div>
        
        <button id="schedule-confirm" class="confirm-btn">Confirm</button>
      </div>
    `;

    chatBody
      .appendChild(document.createElement("div"))
      .classList.add("message", "bot-schedule");
    chatBody.lastChild.innerHTML = scheduleHtml;

    // Initialize the Flatpickr date and time pickers
    initializeFlatpickr();

    // Add click event listener to confirm button
    document
      .getElementById("schedule-confirm")
      .addEventListener("click", function () {
        const selectedDate = document
          .getElementById("flatpickr-date")
          ._flatpickr.selectedDates[0].toISOString()
          .split("T")[0];
        const selectedTime = document
          .getElementById("flatpickr-time")
          ._flatpickr.selectedDates[0].toTimeString()
          .split(" ")[0];
        const scheduleDetails = `Date: ${selectedDate}, Time: ${selectedTime}, Branch: ${branch}`;
        sendMessage(scheduleDetails, true);
      });
  }

  // Function to initialize the Flatpickr date and time pickers
  function initializeFlatpickr() {
    flatpickr("#flatpickr-date", {
      dateFormat: "Y-m-d",
      minDate: "today",
      defaultDate: "today",
      inline: true,
      theme: "airbnb",
      onReady: function (selectedDates, dateStr, instance) {
        instance.calendarContainer.classList.add("flatpickr-calendar");
      },
      onChange: function (selectedDates, dateStr, instance) {
        // Handle date change
      },
    });

    flatpickr("#flatpickr-time", {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      time_24hr: true,
      defaultDate: new Date().setHours(12, 0),
      inline: true,
      theme: "airbnb",
      onReady: function (selectedDates, dateStr, instance) {
        instance.calendarContainer.classList.add("flatpickr-calendar");
      },
      onChange: function (selectedDates, timeStr, instance) {
        // Handle time change
      },
    });
  }

  function showConfirmationCard(details) {
    const { date, time, branch, address, phoneNumber, contactPerson } = details;
    const formattedTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  
    const confirmationHtml = `
      <div id="confirmation-card" class="confirmation-card transferDetailsCard">
        <i id="confirmation-icon" class="fas fa-check-circle"></i>
        <h3 id="confirmation-title">Call Scheduled</h3>
        <div class="confirmation-details">
          <p><i class="far fa-calendar-alt"></i> <strong>Date:</strong> ${date}</p>
          <p><i class="far fa-clock"></i> <strong>Time:</strong> ${formattedTime}</p>
          <p><i class="far fa-building"></i> <strong>Branch:</strong> ${branch}</p>
          <p><i class="fas fa-map-marker-alt"></i> <strong>Address:</strong> ${address}</p>
          <p><i class="fas fa-phone"></i> <strong>Phone:</strong> ${phoneNumber}</p>
          <p><i class="far fa-user"></i> <strong>Contact:</strong> ${contactPerson}</p>
        </div>
        <p id="confirmation-message">Thank you! We look forward to speaking with you.</p>
        <i id="appointment-animation" class="fas fa-calendar-check appointment-animation"></i>
      </div>
    `;
  
    chatBody.appendChild(document.createElement('div')).classList.add('message', 'bot-confirmation');
    chatBody.lastChild.innerHTML = confirmationHtml;
  
    // Trigger the animation
    setTimeout(() => {
      document.getElementById('appointment-animation').classList.add('animate');
    }, 100);
  }

  // Listen for custom events
  document.addEventListener("showLocationsCard", showLocationsCard);
  document.addEventListener("showScheduleCard", function (event) {
    showScheduleCard(event.detail.branch);
  });
  document.addEventListener("showConfirmationCard", function (event) {
    showConfirmationCard({
        date: "2024-10-17",
        time: "14:30",
        branch: "Raffles Place",
        address: "123 Main St, Raffles City, Singapore",
        phoneNumber: "+(65) 9388-0143",
        contactPerson: "John Doe"
      });
  });

  // Function to download statement
  window.downloadStatement = function () {
    fetch("/download_statement")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Download_statement_2024_09_17.pdf";
        a.className = "statement-download";
        a.innerHTML =
          '<i class="material-icons">file_download</i>Download_statement_2024_09_17.pdf';

        // Remove any existing download links
        const existingLinks = chatBody.querySelectorAll(".statement-download");
        existingLinks.forEach((link) => link.remove());

        // Append the new download link
        chatBody.appendChild(a);
        scrollToBottom();

        window.URL.revokeObjectURL(url);
        addMessage("Your statement is ready for download.", false);
      })
      .catch((error) => {
        console.error("Error:", error);
        addMessage(
          "Sorry, there was an error preparing your statement. Please try again later.",
          false
        );
      });
  };

  // Add event listener for the close chat button
  const closeChat = document.getElementById("close-chat");
  if (closeChat) {
    closeChat.addEventListener("click", function () {
      chatWindow.style.display = "none";
    });
  }

  // Function to handle file uploads
  function handleFileUpload(file) {
    const formData = new FormData();
    formData.append("file", file);

    fetch("/upload_file", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          addMessage(`File uploaded successfully: ${file.name}`, true);
        } else {
          addMessage("Failed to upload file. Please try again.", true);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        addMessage("An error occurred while uploading the file.", true);
      });
  }

  // Add drag and drop functionality for file uploads
  chatBody.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  chatBody.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });
}); // End of DOMContentLoaded event listener

function createConfetti(container) {
  const colors = [
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff",
  ];

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement("div");
    confetti.classList.add("confetti");
    confetti.style.setProperty(
      "--confetti-color",
      colors[Math.floor(Math.random() * colors.length)]
    );
    confetti.style.left = Math.random() * 100 + "%";
    confetti.style.animationDelay = Math.random() * 3 + "s";
    confetti.style.animationDuration = Math.random() * 2 + 3 + "s";
    container.appendChild(confetti);
  }
}
