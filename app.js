(function () {
  "use strict";

  var SESSION_KEY = "lms_portal_session_v1";
  var RJ_STORE_KEY = "rj_lms_store_v1";
  var REQUIRED_MSG = "This field is required.";
  var INVALID_STUDENT_MSG = "Invalid Student ID or Password.";
  var INVALID_TEACHER_MSG = "Invalid Teacher ID or Password.";

  var loginRole = "student";

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function truncateTitle(title, maxLen) {
    var t = String(title);
    if (t.length <= maxLen) return t;
    return t.slice(0, maxLen) + "\u2026";
  }

  function getCollegeConfig() {
    var c = window.COLLEGE_CONFIG;
    if (!c || !c.college || !Array.isArray(c.students) || !Array.isArray(c.courses)) {
      return null;
    }
    return c;
  }

  function getTeachers(cfg) {
    return Array.isArray(cfg.teachers) ? cfg.teachers : [];
  }

  function getStore() {
    try {
      var raw = localStorage.getItem(RJ_STORE_KEY);
      var d = raw ? JSON.parse(raw) : null;
      if (!d || typeof d !== "object") {
        return { notes: [], requests: [], registrations: [], submissions: [] };
      }
      d.notes = Array.isArray(d.notes) ? d.notes : [];
      d.requests = Array.isArray(d.requests) ? d.requests : [];
      d.registrations = Array.isArray(d.registrations) ? d.registrations : [];
      d.submissions = Array.isArray(d.submissions) ? d.submissions : [];
      return d;
    } catch (e) {
      return { notes: [], requests: [], registrations: [], submissions: [] };
    }
  }

  function setStore(data) {
    localStorage.setItem(RJ_STORE_KEY, JSON.stringify(data));
  }

  function teacherDisplayName(cfg, teacherId) {
    var t = findTeacher(cfg, teacherId);
    if (!t) return teacherId;
    return t.firstName + " " + t.lastName;
  }

  function findTeacher(cfg, tid) {
    var norm = String(tid || "").trim();
    if (!norm) return null;
    var upper = norm.toUpperCase();
    var list = getTeachers(cfg);
    for (var i = 0; i < list.length; i++) {
      var id = list[i].teacherId;
      if (id === norm || String(id).toUpperCase() === upper) return list[i];
    }
    return null;
  }

  function ensureStoreSeeded(cfg) {
    var store = getStore();
    var seed = cfg.seedDynamicContent;
    if (!seed) {
      setStore(store);
      return;
    }
    var now = Date.now();
    if (store.notes.length === 0 && Array.isArray(seed.notes)) {
      seed.notes.forEach(function (n, i) {
        store.notes.push({
          id: "seed_n_" + i + "_" + now,
          teacherId: n.teacherId,
          teacherName: teacherDisplayName(cfg, n.teacherId),
          courseCode: n.courseCode,
          title: n.title,
          fileName: n.fileName || "(no file)",
          uploadedAt: new Date(now - (seed.notes.length - i) * 7200000).toISOString(),
        });
      });
    }
    if (store.requests.length === 0 && Array.isArray(seed.noteSubmissionRequests)) {
      seed.noteSubmissionRequests.forEach(function (r, i) {
        var days = typeof r.dueOffsetDays === "number" ? r.dueOffsetDays : 5;
        store.requests.push({
          id: "seed_r_" + i + "_" + now,
          teacherId: r.teacherId,
          teacherName: teacherDisplayName(cfg, r.teacherId),
          courseCode: r.courseCode,
          title: r.title,
          description: r.description || "",
          dueIso: new Date(now + days * 86400000).toISOString(),
        });
      });
    }
    setStore(store);
  }

  function deptById(cfg, id) {
    var list = cfg.departments || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return { name: id || "—", hod: "—" };
  }

  function coursesForStudent(cfg, student) {
    var codes = student.enrolledCourseCodes || [];
    var map = {};
    cfg.courses.forEach(function (co) {
      map[co.code] = co;
    });
    return codes
      .map(function (code) {
        return map[code];
      })
      .filter(Boolean);
  }

  function coursesForTeacher(cfg, teacher) {
    var codes = teacher.courseCodes || [];
    var map = {};
    cfg.courses.forEach(function (co) {
      map[co.code] = co;
    });
    return codes
      .map(function (code) {
        return map[code];
      })
      .filter(Boolean);
  }

  function buildAssignmentsForCourses(courses) {
    var now = Date.now();
    var out = [];
    courses.forEach(function (course) {
      var items = course.assignments || [];
      items.forEach(function (a) {
        var dueMs = now;
        if (typeof a.dueOffsetHours === "number") {
          dueMs += a.dueOffsetHours * 3600 * 1000;
        } else if (typeof a.dueOffsetDays === "number") {
          dueMs += a.dueOffsetDays * 86400 * 1000;
        }
        out.push({
          title: a.title,
          course: course.name,
          courseCode: course.code,
          status: a.status || "Incomplete",
          due: new Date(dueMs).toISOString(),
        });
      });
    });
    return out;
  }

  function buildStudentDashboardPayload(cfg, student) {
    var courses = coursesForStudent(cfg, student);
    var assignments = buildAssignmentsForCourses(courses);
    return {
      firstName: student.firstName,
      lastName: student.lastName,
      program: student.program,
      rollNo: student.rollNo,
      semester: student.semester,
      courses: courses.map(function (c) {
        var d = deptById(cfg, c.deptId);
        return {
          code: c.code,
          name: c.name,
          credits: c.credits,
          instructor: c.instructor,
          room: c.room,
          module: c.module,
          department: d.name,
        };
      }),
      assignments: assignments,
    };
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (s && !s.role) s.role = "student";
      return s;
    } catch (e) {
      return null;
    }
  }

  function setSession(data) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function showView(name) {
    $("login-view").hidden = name !== "login";
    $("register-view").hidden = name !== "register";
    $("dashboard-view").hidden = name !== "dashboard";
    $("teacher-dashboard-view").hidden = name !== "teacher";

    if (name === "login") {
      document.title = "Login — R.J. College LMS";
    } else if (name === "register") {
      document.title = "Register — R.J. College · B.Sc. IT";
    } else if (name === "teacher") {
      document.title = "Teacher — R.J. College LMS";
    } else {
      document.title = "Student — R.J. College LMS";
    }
  }

  function hideEl(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
  }

  function showError(el, msg) {
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
  }

  function dueUrgencyClass(isoDue) {
    var due = new Date(isoDue).getTime();
    var now = Date.now();
    var ms = due - now;
    var hours = ms / (1000 * 60 * 60);
    if (ms < 0) return "overdue";
    if (hours <= 24) return "urgent";
    if (hours <= 24 * 7) return "soon";
    return "normal";
  }

  function formatDueLabel(isoDue) {
    var d = new Date(isoDue);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function renderLoginBranding(cfg) {
    if (!cfg) {
      $("login-hero-title").innerHTML = "Configure <span>college-data.js</span>";
      $("login-hero-text").textContent =
        "Add college-data.js next to index.html, or check the browser console for errors.";
      $("login-hero-facts").innerHTML = "";
      $("login-card-title").textContent = "Setup needed";
      $("login-card-subtitle").textContent = "College configuration not found.";
      return;
    }
    var col = cfg.college;
    $("login-hero-title").innerHTML =
      "Welcome to <span>" + escapeHtml(col.shortName || col.name) + "</span>";
    $("login-hero-text").textContent =
      (col.tagline || "Sign in with your college ID and password.") +
      " Academic year " +
      escapeHtml(cfg.academicYear || "") +
      ".";
    $("login-logo").textContent = (col.logoLetter || col.shortName || "R").slice(0, 1).toUpperCase();
    $("login-card-title").textContent = (col.shortName || col.name) + " — Portal";
    $("login-card-subtitle").textContent =
      "Semester: " + (cfg.currentSemester || "—") + " · " + (cfg.programBscIt || "");

    var ext = $("link-register-external");
    if (col.registrationExternalUrl && String(col.registrationExternalUrl).trim()) {
      ext.href = col.registrationExternalUrl.trim();
      ext.hidden = false;
    } else {
      ext.hidden = true;
    }

    var facts = $("login-hero-facts");
    facts.innerHTML = "";
    function addFact(label, value) {
      var div = document.createElement("div");
      div.className = "login-fact";
      div.innerHTML =
        '<div class="login-fact__label">' +
        escapeHtml(label) +
        "</div>" +
        '<div class="login-fact__value">' +
        escapeHtml(value) +
        "</div>";
      facts.appendChild(div);
    }
    if (col.establishedYear) addFact("Established", String(col.establishedYear));
    if (cfg.programBscIt) addFact("Flagship program", "B.Sc. IT");
    if (getTeachers(cfg).length) addFact("Faculty accounts", String(getTeachers(cfg).length) + " (demo)");
  }

  function renderCollegeSidebar(cfg) {
    var dl = $("college-sidebar-dl");
    dl.innerHTML = "";
    if (!cfg) return;
    var col = cfg.college;
    function row(term, def) {
      var dt = document.createElement("dt");
      dt.textContent = term;
      var dd = document.createElement("dd");
      dd.innerHTML = def;
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    var fullName = col.fullOfficialName || col.name;
    row("Full official name", escapeHtml(fullName));
    if (col.fullOfficialName && col.fullOfficialName !== col.name) {
      row("Short display name", escapeHtml(col.name));
    }
    row("Campus", escapeHtml(col.address || "—"));
    row("Phone", escapeHtml(col.phone || "—"));
    row(
      "Email",
      col.email
        ? '<a href="mailto:' + escapeHtml(col.email) + '">' + escapeHtml(col.email) + "</a>"
        : "—"
    );
    if (col.website) {
      row(
        "Website",
        '<a href="' +
          escapeHtml(col.website) +
          '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(col.website) +
          "</a>"
      );
    }
  }

  function findStudent(cfg, sid) {
    var norm = String(sid || "").trim();
    if (!norm) return null;
    var upper = norm.toUpperCase();
    for (var i = 0; i < cfg.students.length; i++) {
      var id = cfg.students[i].studentId;
      if (id === norm || String(id).toUpperCase() === upper) return cfg.students[i];
    }
    return null;
  }

  function pendingAssignments(all) {
    return all.filter(function (a) {
      return a.status === "Incomplete" || a.status === "Pending";
    });
  }

  function sortByDue(list) {
    return list.slice().sort(function (a, b) {
      return new Date(a.due) - new Date(b.due);
    });
  }

  function studentHasSubmission(store, requestId, studentId) {
    return store.submissions.some(function (s) {
      return s.requestId === requestId && s.studentId === studentId;
    });
  }

  function renderStudentNotesAndRequests(cfg, student) {
    var codes = student.enrolledCourseCodes || [];
    var codeSet = {};
    codes.forEach(function (c) {
      codeSet[c] = true;
    });
    var store = getStore();

    var notesEl = $("student-notes-list");
    notesEl.innerHTML = "";
    var notes = store.notes.filter(function (n) {
      return codeSet[n.courseCode];
    });
    notes.sort(function (a, b) {
      return new Date(b.uploadedAt) - new Date(a.uploadedAt);
    });
    if (notes.length === 0) {
      notesEl.innerHTML = '<li class="empty">No teacher notes yet for your courses.</li>';
    } else {
      notes.forEach(function (n) {
        var li = document.createElement("li");
        li.className = "list-row list-row--note";
        li.innerHTML =
          '<span class="list-row__code">' +
          escapeHtml(n.courseCode) +
          "</span>" +
          '<span class="list-row__title">' +
          escapeHtml(n.title) +
          "</span>" +
          '<span class="list-row__meta">' +
          escapeHtml(n.teacherName) +
          " · " +
          escapeHtml(formatDueLabel(n.uploadedAt)) +
          "<br /><span class=\"file-chip\">" +
          escapeHtml(n.fileName) +
          "</span></span>";
        notesEl.appendChild(li);
      });
    }

    var reqEl = $("student-note-requests-list");
    reqEl.innerHTML = "";
    var reqs = store.requests.filter(function (r) {
      return codeSet[r.courseCode];
    });
    reqs.sort(function (a, b) {
      return new Date(a.dueIso) - new Date(b.dueIso);
    });
    if (reqs.length === 0) {
      reqEl.innerHTML = '<li class="empty">No submission requests right now.</li>';
    } else {
      reqs.forEach(function (r) {
        var done = studentHasSubmission(store, r.id, student.studentId);
        var li = document.createElement("li");
        li.className = "list-row list-row--request";
        var u = dueUrgencyClass(r.dueIso);
        li.className += " due due--" + u;
        var statusHtml = done
          ? '<span class="status-pill status-pill--ok">Submitted</span>'
          : '<span class="status-pill status-pill--pending">Pending</span>';
        li.innerHTML =
          '<div class="request-head">' +
          '<span class="list-row__code">' +
          escapeHtml(r.courseCode) +
          "</span>" +
          statusHtml +
          "</div>" +
          '<span class="list-row__title">' +
          escapeHtml(r.title) +
          "</span>" +
          '<span class="list-row__meta">' +
          escapeHtml(r.teacherName) +
          " · Due " +
          escapeHtml(formatDueLabel(r.dueIso)) +
          "</span>" +
          (r.description
            ? '<p class="request-desc">' + escapeHtml(r.description) + "</p>"
            : "") +
          (done
            ? '<p class="form-hint form-hint--ok">Your file was recorded for this demo.</p>'
            : '<div class="submit-inline" data-request-id="' +
              escapeHtml(r.id) +
              '">' +
              '<label class="sr-only" for="stu-file-' +
              escapeHtml(r.id) +
              '">File</label>' +
              '<input type="text" class="input-mini" id="stu-file-' +
              escapeHtml(r.id) +
              '" placeholder="e.g. BIT24-045_unit4.pdf" />' +
              '<button type="button" class="btn btn--sm btn--gold stu-submit-btn">Submit</button>' +
              "</div>");
        reqEl.appendChild(li);
      });

      reqEl.querySelectorAll(".stu-submit-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var wrap = btn.closest(".submit-inline");
          if (!wrap) return;
          var rid = wrap.getAttribute("data-request-id");
          var inp = wrap.querySelector(".input-mini");
          var fname = (inp && inp.value) ? inp.value.trim() : "";
          if (!fname) {
            alert("Enter a file name (demo — no upload server).");
            return;
          }
          var st = getStore();
          st.submissions.push({
            id: "sub_" + Date.now(),
            requestId: rid,
            studentId: student.studentId,
            fileName: fname,
            submittedAt: new Date().toISOString(),
          });
          setStore(st);
          renderDashboard();
        });
      });
    }
  }

  function fillTeacherSelects(cfg, teacher) {
    var courses = coursesForTeacher(cfg, teacher);
    var uploadSel = $("upload-course");
    var reqSel = $("req-course");
    [uploadSel, reqSel].forEach(function (sel) {
      sel.innerHTML = "";
      if (courses.length === 0) {
        var o = document.createElement("option");
        o.value = "";
        o.textContent = "Add courseCodes in college-data.js";
        sel.appendChild(o);
        return;
      }
      courses.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c.code;
        opt.textContent = c.code + " — " + c.name;
        sel.appendChild(opt);
      });
    });
    var due = $("req-due");
    if (due && !due.value) {
      var d = new Date(Date.now() + 5 * 86400000);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      due.value = d.toISOString().slice(0, 16);
    }
  }

  function renderTeacherPublished(cfg, teacher) {
    var store = getStore();
    var mine = store.notes.filter(function (n) {
      return n.teacherId === teacher.teacherId;
    });
    mine.sort(function (a, b) {
      return new Date(b.uploadedAt) - new Date(a.uploadedAt);
    });
    var el = $("teacher-published-notes");
    el.innerHTML = "";
    if (mine.length === 0) {
      el.innerHTML = '<li class="empty">You have not published any notes yet.</li>';
    } else {
      mine.forEach(function (n) {
        var li = document.createElement("li");
        li.className = "list-row list-row--note";
        li.innerHTML =
          '<span class="list-row__code">' +
          escapeHtml(n.courseCode) +
          "</span>" +
          '<span class="list-row__title">' +
          escapeHtml(n.title) +
          "</span>" +
          '<span class="list-row__meta">' +
          escapeHtml(formatDueLabel(n.uploadedAt)) +
          " · <span class=\"file-chip\">" +
          escapeHtml(n.fileName) +
          "</span></span>";
        el.appendChild(li);
      });
    }

    var rel = $("teacher-requests-list");
    rel.innerHTML = "";
    var reqs = store.requests.filter(function (r) {
      return r.teacherId === teacher.teacherId;
    });
    reqs.sort(function (a, b) {
      return new Date(a.dueIso) - new Date(b.dueIso);
    });
    if (reqs.length === 0) {
      rel.innerHTML = '<li class="empty">No submission requests yet.</li>';
    } else {
      reqs.forEach(function (r) {
        var count = store.submissions.filter(function (s) {
          return s.requestId === r.id;
        }).length;
        var li = document.createElement("li");
        li.className = "list-row";
        li.innerHTML =
          '<span class="list-row__code">' +
          escapeHtml(r.courseCode) +
          "</span>" +
          '<span class="list-row__title">' +
          escapeHtml(r.title) +
          "</span>" +
          '<span class="list-row__meta">Due ' +
          escapeHtml(formatDueLabel(r.dueIso)) +
          " · Demo submissions recorded: " +
          count +
          "</span>";
        rel.appendChild(li);
      });
    }
  }

  function renderTeacherCourses(cfg, teacher) {
    var ul = $("teacher-courses-list");
    ul.innerHTML = "";
    coursesForTeacher(cfg, teacher).forEach(function (c) {
      var li = document.createElement("li");
      li.innerHTML =
        "<strong>" +
        escapeHtml(c.code) +
        "</strong> — " +
        escapeHtml(c.name);
      ul.appendChild(li);
    });
  }

  function renderTeacherDashboard() {
    var session = getSession();
    var cfg = getCollegeConfig();
    if (!session || session.role !== "teacher" || !cfg) {
      showView("login");
      return;
    }
    var teacher = findTeacher(cfg, session.teacherId);
    if (!teacher) {
      clearSession();
      showView("login");
      return;
    }

    var col = cfg.college;
    $("teacher-dash-logo").textContent = (col.logoLetter || "R").slice(0, 1).toUpperCase();
    $("teacher-dash-college").textContent = col.name + " — Faculty";
    $("teacher-welcome-name").textContent = teacher.firstName + " " + teacher.lastName;
    $("teacher-welcome-detail").textContent =
      (teacher.designation || "Faculty") + " · " + (teacher.teacherId || "");

    fillTeacherSelects(cfg, teacher);
    renderTeacherCourses(cfg, teacher);
    renderTeacherPublished(cfg, teacher);
    $("upload-feedback").textContent = "";
    $("req-feedback").textContent = "";

    showView("teacher");
  }

  function renderDashboard() {
    var session = getSession();
    var cfg = getCollegeConfig();

    if (!session || session.role !== "student") {
      if (session && session.role === "teacher") {
        renderTeacherDashboard();
        return;
      }
      showView("login");
      return;
    }

    if (!cfg) {
      showView("login");
      showError(
        $("login-general-error"),
        "College configuration is missing. Ensure college-data.js is loaded."
      );
      return;
    }

    var student = findStudent(cfg, session.studentId);
    if (!student) {
      clearSession();
      showView("login");
      showError($("login-general-error"), INVALID_STUDENT_MSG);
      return;
    }

    var data = buildStudentDashboardPayload(cfg, student);
    var col = cfg.college;

    $("dash-logo").textContent = (col.logoLetter || "R").slice(0, 1).toUpperCase();
    $("dash-college-name").textContent = col.name;
    $("dash-college-meta").textContent =
      (cfg.academicYear || "") + (cfg.currentSemester ? " · " + cfg.currentSemester : "");

    $("welcome-name").textContent =
      (session.firstName || data.firstName) + " " + (session.lastName || data.lastName || "");
    $("welcome-detail").textContent =
      (data.rollNo || "") +
      (data.program ? " · " + data.program : "") +
      (data.semester ? " · Sem " + data.semester : "");

    renderCollegeSidebar(cfg);
    renderStudentNotesAndRequests(cfg, student);

    $("classes-subtitle").textContent =
      data.courses.length +
      " enrolled course" +
      (data.courses.length === 1 ? "" : "s") +
      " (B.Sc. IT).";

    var classesEl = $("classes-list");
    classesEl.innerHTML = "";
    if (data.courses.length === 0) {
      classesEl.innerHTML =
        '<li class="empty">No courses — check <code>enrolledCourseCodes</code> in <code>college-data.js</code>.</li>';
    } else {
      data.courses.forEach(function (c) {
        var li = document.createElement("li");
        li.className = "list-row";
        li.innerHTML =
          '<span class="list-row__code">' +
          escapeHtml(c.code) +
          "</span>" +
          '<span class="list-row__title">' +
          escapeHtml(c.name) +
          "</span>" +
          '<span class="list-row__meta">' +
          escapeHtml(c.department) +
          " · " +
          escapeHtml(String(c.credits)) +
          " credits · " +
          escapeHtml(c.instructor) +
          "<br />" +
          escapeHtml(c.room) +
          " · " +
          escapeHtml(c.module) +
          "</span>";
        classesEl.appendChild(li);
      });
    }

    var pending = sortByDue(pendingAssignments(data.assignments));
    var assignEl = $("assignments-list");
    assignEl.innerHTML = "";
    if (pending.length === 0) {
      assignEl.innerHTML = '<li class="empty">No pending assignments.</li>';
    } else {
      pending.forEach(function (a) {
        var shortTitle = truncateTitle(a.title, 48);
        var li = document.createElement("li");
        li.className = "list-row";
        li.innerHTML =
          '<span class="list-row__code">' +
          escapeHtml(a.courseCode) +
          "</span>" +
          '<span class="list-row__title" title="' +
          escapeHtml(a.title) +
          '">' +
          escapeHtml(shortTitle) +
          "</span>" +
          '<span class="list-row__meta">' +
          escapeHtml(a.course) +
          " · " +
          escapeHtml(a.status) +
          " · due " +
          escapeHtml(formatDueLabel(a.due)) +
          "</span>";
        assignEl.appendChild(li);
      });
    }

    var dueEl = $("due-dates-list");
    dueEl.innerHTML = "";
    if (pending.length === 0) {
      dueEl.innerHTML = '<li class="empty">No upcoming due dates.</li>';
    } else {
      pending.forEach(function (a) {
        var u = dueUrgencyClass(a.due);
        var shortTitle = truncateTitle(a.title, 44);
        var li = document.createElement("li");
        li.className = "list-row due due--" + u;
        li.innerHTML =
          '<span class="due__date">' +
          escapeHtml(formatDueLabel(a.due)) +
          "</span>" +
          '<span class="due__detail" title="' +
          escapeHtml(a.title) +
          '">' +
          escapeHtml(a.courseCode) +
          " · " +
          escapeHtml(shortTitle) +
          " — " +
          escapeHtml(a.course) +
          "</span>";
        dueEl.appendChild(li);
      });
    }

    showView("dashboard");
  }

  function setLoginRole(role) {
    loginRole = role;
    var studentTab = $("role-tab-student");
    var teacherTab = $("role-tab-teacher");
    var isStudent = role === "student";
    studentTab.classList.toggle("role-tabs__btn--active", isStudent);
    studentTab.setAttribute("aria-selected", isStudent ? "true" : "false");
    teacherTab.classList.toggle("role-tabs__btn--active", !isStudent);
    teacherTab.setAttribute("aria-selected", !isStudent ? "true" : "false");

    $("login-user-label").textContent = isStudent ? "ID card number" : "Staff code";
    $("user_id").placeholder = isStudent ? "e.g. 240045" : "e.g. 501";
    $("login-card-title").textContent = isStudent ? "Student login" : "Teacher login";
    $("login-submit-btn").textContent = isStudent ? "Log in to student dashboard" : "Log in to teacher workspace";
    hideEl($("login-general-error"));
    hideEl($("user_id-error"));
    hideEl($("password-error"));
  }

  function wireLoginForm(cfg) {
    $("role-tab-student").addEventListener("click", function () {
      setLoginRole("student");
    });
    $("role-tab-teacher").addEventListener("click", function () {
      setLoginRole("teacher");
    });

    $("login-form").addEventListener("submit", function (e) {
      e.preventDefault();

      var uidEl = $("user_id");
      var pwEl = $("password");
      var uid = (uidEl.value || "").trim();
      if (loginRole === "student" || loginRole === "teacher") {
        var digits = uid.replace(/\D/g, "");
        if (digits) uid = digits;
      }
      var pw = pwEl.value || "";

      hideEl($("user_id-error"));
      hideEl($("password-error"));
      hideEl($("login-general-error"));

      if (!uid) showError($("user_id-error"), REQUIRED_MSG);
      if (!pw) showError($("password-error"), REQUIRED_MSG);
      if (!uid || !pw) return;

      if (!cfg) {
        showError($("login-general-error"), "College configuration not loaded.");
        return;
      }

      if (loginRole === "student") {
        var student = findStudent(cfg, uid);
        if (!student || student.password !== pw) {
          showError($("login-general-error"), INVALID_STUDENT_MSG);
          return;
        }
        setSession({
          role: "student",
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
        });
        renderDashboard();
      } else {
        var teacher = findTeacher(cfg, uid);
        if (!teacher || teacher.password !== pw) {
          showError($("login-general-error"), INVALID_TEACHER_MSG);
          return;
        }
        setSession({
          role: "teacher",
          teacherId: teacher.teacherId,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
        });
        renderTeacherDashboard();
      }
    });
  }

  function wireRegistration(cfg) {
    $("link-register").addEventListener("click", function (e) {
      e.preventDefault();
      hideEl($("register-general-error"));
      $("register-success").hidden = true;
      $("register-success").textContent = "";
      $("register-program-label").textContent = cfg
        ? cfg.programBscIt || "B.Sc. Information Technology"
        : "B.Sc. Information Technology";
      $("register-logo").textContent = cfg && cfg.college
        ? (cfg.college.logoLetter || "R").slice(0, 1).toUpperCase()
        : "R";
      showView("register");
    });

    $("register-back").addEventListener("click", function () {
      showView("login");
    });

    $("register-form").addEventListener("submit", function (e) {
      e.preventDefault();
      hideEl($("reg_first-error"));
      hideEl($("reg_last-error"));
      hideEl($("reg_email-error"));
      hideEl($("reg_proposed_id-error"));
      hideEl($("reg_password-error"));
      hideEl($("register-general-error"));

      var first = ($("reg_first").value || "").trim();
      var last = ($("reg_last").value || "").trim();
      var email = ($("reg_email").value || "").trim();
      var phone = ($("reg_phone").value || "").trim();
      var proposed = ($("reg_proposed_id").value || "").trim();
      var pass = $("reg_password").value || "";

      var ok = true;
      if (!first) {
        showError($("reg_first-error"), REQUIRED_MSG);
        ok = false;
      }
      if (!last) {
        showError($("reg_last-error"), REQUIRED_MSG);
        ok = false;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError($("reg_email-error"), "Enter a valid email.");
        ok = false;
      }
      if (!proposed) {
        showError($("reg_proposed_id-error"), REQUIRED_MSG);
        ok = false;
      }
      if (!pass || pass.length < 6) {
        showError($("reg_password-error"), "Use at least 6 characters.");
        ok = false;
      }
      if (!ok) return;

      var store = getStore();
      store.registrations.push({
        at: new Date().toISOString(),
        firstName: first,
        lastName: last,
        email: email,
        phone: phone,
        program: cfg ? cfg.programBscIt || "B.Sc. IT" : "B.Sc. IT",
        proposedStudentId: proposed,
        password: pass,
      });
      setStore(store);

      $("register-form").reset();
      $("register-success").hidden = false;
      $("register-success").textContent =
        "Registration saved locally for this demo. The office will verify documents in a real process. You can return to login — ask your admin to add your account in college-data.js when approved.";
    });
  }

  function wireTeacherForms(cfg) {
    $("teacher-upload-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var session = getSession();
      if (!session || session.role !== "teacher") return;
      var teacher = findTeacher(cfg, session.teacherId);
      if (!teacher) return;

      var courseCode = $("upload-course").value;
      if (!courseCode) {
        $("upload-feedback").textContent = "No course assigned to this teacher in college-data.js.";
        return;
      }
      var title = ($("upload-title").value || "").trim();
      var fileInput = $("upload-file");
      var file = fileInput.files && fileInput.files[0];
      var fileName = file ? file.name : "(title only — no file)";

      if (!title) {
        $("upload-feedback").textContent = "Add a title for this note.";
        return;
      }

      var store = getStore();
      store.notes.push({
        id: "n_" + Date.now(),
        teacherId: teacher.teacherId,
        teacherName: teacher.firstName + " " + teacher.lastName,
        courseCode: courseCode,
        title: title,
        fileName: fileName,
        uploadedAt: new Date().toISOString(),
      });
      setStore(store);
      $("upload-title").value = "";
      fileInput.value = "";
      $("upload-feedback").textContent = "Note published for " + courseCode + ".";
      renderTeacherPublished(cfg, teacher);
    });

    $("teacher-request-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var session = getSession();
      if (!session || session.role !== "teacher") return;
      var teacher = findTeacher(cfg, session.teacherId);
      if (!teacher) return;

      var courseCode = $("req-course").value;
      if (!courseCode) {
        $("req-feedback").textContent = "No course assigned — check teacher courseCodes.";
        return;
      }
      var title = ($("req-title").value || "").trim();
      var desc = ($("req-desc").value || "").trim();
      var dueVal = $("req-due").value;

      if (!title) {
        $("req-feedback").textContent = "Enter a task title.";
        return;
      }
      var dueIso = dueVal ? new Date(dueVal).toISOString() : new Date(Date.now() + 5 * 86400000).toISOString();

      var store = getStore();
      store.requests.push({
        id: "r_" + Date.now(),
        teacherId: teacher.teacherId,
        teacherName: teacher.firstName + " " + teacher.lastName,
        courseCode: courseCode,
        title: title,
        description: desc,
        dueIso: dueIso,
      });
      setStore(store);
      $("req-title").value = "";
      $("req-desc").value = "";
      $("req-feedback").textContent = "Students in " + courseCode + " will see this request.";
      renderTeacherPublished(cfg, teacher);
    });
  }

  function wireLogout() {
    $("logout-btn").addEventListener("click", function () {
      clearSession();
      $("password").value = "";
      hideEl($("login-general-error"));
      hideEl($("user_id-error"));
      hideEl($("password-error"));
      showView("login");
    });
    $("teacher-logout-btn").addEventListener("click", function () {
      clearSession();
      $("password").value = "";
      showView("login");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var cfg = getCollegeConfig();
    if (cfg) {
      ensureStoreSeeded(cfg);
    }
    renderLoginBranding(cfg);
    setLoginRole("student");
    wireLoginForm(cfg);
    if (cfg) {
      wireRegistration(cfg);
      wireTeacherForms(cfg);
    } else {
      $("link-register").addEventListener("click", function (e) {
        e.preventDefault();
      });
    }
    wireLogout();

    var s = getSession();
    if (s && s.role === "teacher") {
      renderTeacherDashboard();
    } else if (s && s.role === "student") {
      renderDashboard();
    } else {
      showView("login");
    }
  });
})();
