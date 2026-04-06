document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => {
      const htmlEntities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return htmlEntities[character];
    });
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    window.clearTimeout(showMessage.timeoutId);
    showMessage.timeoutId = window.setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function createParticipantMarkup(activityName, participants) {
    if (participants.length === 0) {
      return '<p class="participants-empty">No students signed up yet.</p>';
    }

    const participantItems = participants
      .map(
        (participant) => `
          <div class="participant-row">
            <span class="participant-email">${escapeHtml(participant)}</span>
            <button
              type="button"
              class="participant-remove-btn"
              data-activity="${encodeURIComponent(activityName)}"
              data-email="${encodeURIComponent(participant)}"
              aria-label="Remove ${escapeHtml(participant)} from ${escapeHtml(activityName)}"
              title="Remove participant"
            >
              <span class="participant-remove-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v7h-2v-7zm4 0h2v7h-2v-7zM7 10h2v7H7v-7zm-1 10h12l1-12H5l1 12z"></path>
                </svg>
              </span>
            </button>
          </div>
        `
      )
      .join("");

    return `<div class="participants-list">${participantItems}</div>`;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }

      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const capacityLabel = `${details.participants.length}/${details.max_participants} enrolled`;

        activityCard.innerHTML = `
          <div class="activity-card-header">
            <h4>${escapeHtml(name)}</h4>
            <span class="activity-pill">${escapeHtml(capacityLabel)}</span>
          </div>
          <p class="activity-description">${escapeHtml(details.description)}</p>
          <div class="activity-meta">
            <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
            <p><strong>Availability:</strong> ${escapeHtml(`${spotsLeft} spots left`)}</p>
          </div>
          <div class="participants-section">
            <div class="participants-heading-row">
              <h5>Participants</h5>
              <span class="participants-count">${details.participants.length}</span>
            </div>
            ${createParticipantMarkup(name, details.participants)}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".participant-remove-btn");

    if (!removeButton) {
      return;
    }

    const activity = removeButton.dataset.activity;
    const email = removeButton.dataset.email;

    if (!activity || !email) {
      return;
    }

    removeButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${activity}/participants?email=${email}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        await fetchActivities();
      } else {
        showMessage(result.detail || "Failed to remove participant.", "error");
      }
    } catch (error) {
      showMessage("Failed to remove participant. Please try again.", "error");
      console.error("Error removing participant:", error);
    } finally {
      removeButton.disabled = false;
    }
  });

  // Initialize app
  void fetchActivities();
});
