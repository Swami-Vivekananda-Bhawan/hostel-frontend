document.addEventListener("DOMContentLoaded", () => {
  // --- GLOBAL SETUP ---
  const API_URL = "http://localhost:3001";
  const token = localStorage.getItem('accessToken');
  const userId = localStorage.getItem('userId');
  const fullName = localStorage.getItem('fullName');
  const scholarNumber = localStorage.getItem('scholarNumber');
  const userRole = localStorage.getItem('userRole');
  const headers = { 'x-access-token': token };

  // --- DOM Element Selection ---
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileMenuLinks = mobileMenu.querySelectorAll("a");
  const statusModal = document.getElementById("status-modal");
  const modalContent = statusModal.querySelector(".modal-content");
  const modalTitle = document.getElementById("modal-title");
  const modalMessage = document.getElementById("modal-message");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const loginPromptModal = document.getElementById('login-prompt-modal');
  const promptCloseBtn = document.getElementById('prompt-close-btn');
  const loginLink = document.getElementById('login-link');
  const userInfo = document.getElementById('user-info');
  const userNameEl = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');
  const adminPanelBtn = document.getElementById('admin-panel-btn');
  const mobileLoginLink = document.getElementById('mobile-login-link');
  const leaveFormSection = document.getElementById('leave-request');
  const complaintFormSection = document.getElementById('complaints');
  const notificationBell = document.getElementById('notification-bell');
  const notificationCount = document.getElementById('notification-count');
  const notificationDropdown = document.getElementById('notification-dropdown');

  // --- Notification Logic ---
  const fetchNotifications = async () => {
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/api/notifications`, { headers });
        if (!res.ok) throw new Error("Failed to fetch notifications");
        const notifications = await res.json();
        updateNotificationUI(notifications);
    } catch (error) { console.error(error); }
  };

  const updateNotificationUI = (notifications) => {
    if (notifications.length > 0) {
        notificationCount.textContent = notifications.length;
        notificationCount.style.display = 'flex';
        notificationDropdown.innerHTML = notifications.map(n => `<div class="notification-item">${n.message}</div>`).join('');
    } else {
        notificationCount.style.display = 'none';
        notificationDropdown.innerHTML = '<div class="notification-item">No new notifications</div>';
    }
  };

  if (notificationBell) {
    notificationBell.addEventListener('click', async (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('active');
        if (notificationDropdown.classList.contains('active') && parseInt(notificationCount.textContent) > 0) {
            try {
                await fetch(`${API_URL}/api/notifications/read`, { method: 'PATCH', headers });
                notificationCount.style.display = 'none';
            } catch (error) { console.error("Failed to mark notifications as read:", error); }
        }
    });
  }
  
  document.addEventListener('click', (e) => {
    if (notificationDropdown && notificationDropdown.classList.contains('active') && !notificationBell.contains(e.target)) {
        notificationDropdown.classList.remove('active');
    }
  });

  // --- Login Status and UI Update ---
  if (token && fullName) {
    loginLink.style.display = 'none';
    mobileLoginLink.style.display = 'none';
    userNameEl.textContent = `Welcome, ${fullName.split(' ')[0]}`;
    userInfo.style.display = 'flex';

    if (userRole === 'admin') {
        adminPanelBtn.style.display = 'inline-block';
    }

    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.reload();
    });

    // Connect to socket and fetch notifications only if logged in
    const socket = io(API_URL);
    socket.emit('joinRoom', parseInt(userId));
    socket.on('new_notification', (data) => {
        alert(`New Notification: ${data.message}`);
        fetchNotifications();
    });
    fetchNotifications();

  } else {
    loginLink.style.display = 'block';
    mobileLoginLink.style.display = 'block';
    userInfo.style.display = 'none';
  }
  
  // --- Form Access Control ---
  const showLoginPrompt = () => loginPromptModal.classList.add('active');
  const hideLoginPrompt = () => loginPromptModal.classList.remove('active');

  if(promptCloseBtn) promptCloseBtn.addEventListener('click', hideLoginPrompt);

  if (token && fullName && scholarNumber) {
    // USER IS LOGGED IN: Auto-fill form fields
    const leaveNameInput = document.getElementById('leave-student-name');
    const leaveScholarInput = document.getElementById('leave-scholar-number');
    if(leaveNameInput) {
        leaveNameInput.value = fullName;
        leaveNameInput.readOnly = true;
    }
    if(leaveScholarInput) {
        leaveScholarInput.value = scholarNumber;
        leaveScholarInput.readOnly = true;
    }

    const complaintNameInput = document.getElementById('complaint-student-name');
    const complaintScholarInput = document.getElementById('complaint-scholar-number');
    if(complaintNameInput) {
        complaintNameInput.value = fullName;
        complaintNameInput.readOnly = true;
    }
    if(complaintScholarInput) {
        complaintScholarInput.value = scholarNumber;
        complaintScholarInput.readOnly = true;
    }
  } else {
    // USER IS NOT LOGGED IN: Prevent form access
    const preventAccess = (e) => {
        if (e.target.tagName !== 'A') {
            e.preventDefault();
            e.stopPropagation();
            showLoginPrompt();
        }
    };
    if(leaveFormSection) leaveFormSection.addEventListener('click', preventAccess, true);
    if(complaintFormSection) complaintFormSection.addEventListener('click', preventAccess, true);
  }

  // --- Mobile Menu Functionality ---
  const toggleMobileMenu = () => {
    const isMenuOpen = mobileMenu.style.display === "block";
    mobileMenu.style.display = isMenuOpen ? "none" : "block";
    mobileMenuButton.innerHTML = isMenuOpen
      ? '<i class="fas fa-bars"></i>'
      : '<i class="fas fa-times"></i>';
  };

  if(mobileMenuButton) mobileMenuButton.addEventListener("click", toggleMobileMenu);

  if(mobileMenuLinks) mobileMenuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (mobileMenu.style.display === "block") {
        toggleMobileMenu();
      }
    });
  });

  // --- Status Modal Functionality ---
  const showStatusModal = (title, message, isSuccess = true) => {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalContent.classList.toggle("success", isSuccess);
    modalContent.classList.toggle("error", !isSuccess);
    statusModal.classList.add("active");
  };

  const closeStatusModal = () => {
    statusModal.classList.remove("active");
  };

  if(modalCloseBtn) modalCloseBtn.addEventListener("click", closeStatusModal);
  if(statusModal) statusModal.addEventListener("click", (e) => {
    if (e.target === statusModal) {
      closeStatusModal();
    }
  });

  // --- Generic Form Submission Handling ---
  const handleFormSubmit = (form, endpoint, validationFn, isMultipart = false) => {
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const requiredFields = form.querySelectorAll("[required]");
      let allFieldsValid = true;
      requiredFields.forEach((field) => {
        if (!field.value.trim()) {
          allFieldsValid = false;
        }
      });

      if (!allFieldsValid) {
        showStatusModal("Validation Error", "Please fill out all required fields.", false);
        return;
      }

      if (validationFn && !validationFn(form)) {
        return;
      }

      try {
        let body;
        const currentHeaders = { ...headers }; // Create a copy of headers

        if (isMultipart) {
          body = new FormData(form);
        } else {
          const formData = new FormData(form);
          const data = {};
          formData.forEach((value, key) => {
            const camelCaseKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
            data[camelCaseKey] = value;
          });
          body = JSON.stringify(data);
          currentHeaders['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${API_URL}/api${endpoint}`, {
          method: 'POST',
          headers: currentHeaders,
          body: body,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Something went wrong');
        }

        showStatusModal("Success!", result.message, true);
        form.reset();
        
        if (token && fullName && scholarNumber) {
            if (form.id === 'leave-form') {
                document.getElementById('leave-student-name').value = fullName;
                document.getElementById('leave-scholar-number').value = scholarNumber;
            } else if (form.id === 'complaint-form') {
                document.getElementById('complaint-student-name').value = fullName;
                document.getElementById('complaint-scholar-number').value = scholarNumber;
            }
        }

      } catch (error) {
        showStatusModal("Submission Error", error.message, false);
      }
    });
  };

  // --- Custom Validation for Leave Form ---
  const validateLeaveForm = (form) => {
    const startDate = form.querySelector("#start-date").value;
    const endDate = form.querySelector("#end-date").value;
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      showStatusModal("Date Error", "Leave end date cannot be before the start date.", false);
      return false;
    }
    return true;
  };

  // --- Initialize all forms ---
  const leaveForm = document.getElementById("leave-form");
  const complaintForm = document.getElementById("complaint-form");
  
  handleFormSubmit(leaveForm, '/leave', validateLeaveForm);
  handleFormSubmit(complaintForm, '/complaints', null, true);
});
