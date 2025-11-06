document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to format participant display name
  function formatParticipant(p) {
    if (typeof p !== "string") return String(p);
    const at = p.indexOf("@");
    if (at > 0) {
      return p.slice(0, at);
    }
    return p;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and previous content
      activitiesList.innerHTML = "";

      // Reset activity select options (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants markup
        let participantsMarkup = "";
        if (Array.isArray(details.participants) && details.participants.length > 0) {
          const items = details.participants
            .map((p) =>
              `<li>
                 <span class="participant-badge">${escapeHtml(formatParticipant(p))}</span>
                 <button class="remove-btn" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" aria-label="Remove participant">&times;</button>
               </li>`
            )
            .join("");
          participantsMarkup = `
            <div class="participants" aria-live="polite">
              <h5>Participants</h5>
              <ul>${items}</ul>
            </div>
          `;
        } else {
          participantsMarkup = `
            <div class="participants" aria-live="polite">
              <h5>Participants</h5>
              <p class="no-participants">No participants yet</p>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsMarkup}
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

  // Simple helper to avoid injecting raw HTML values
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
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
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so the participants list and availability update
        // small delay gives backend a moment to persist before fetching
        setTimeout(fetchActivities, 300);
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Delegate click events for participant remove buttons
  activitiesList.addEventListener("click", async (event) => {
    const target = event.target;
    if (!target.matches(".remove-btn")) return;

    const email = target.dataset.email;
    const activity = target.dataset.activity;

    if (!email || !activity) return;

    // optimistic UI: disable button while request in progress
    target.disabled = true;

    try {
      const resp = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const body = await resp.json().catch(() => ({}));

      if (resp.ok) {
        // refresh activities to update participants and availability
        setTimeout(fetchActivities, 150);
      } else {
        console.error("Failed to unregister:", body);
        // re-enable so user can try again
        target.disabled = false;
      }
    } catch (err) {
      console.error("Error unregistering participant:", err);
      target.disabled = false;
    }
  });

  // Initialize app
  fetchActivities();
});
