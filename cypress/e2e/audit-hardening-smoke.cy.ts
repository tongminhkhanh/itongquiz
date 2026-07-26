/// <reference types="cypress" />

describe('audit hardening login and practice smoke', () => {
  it('keeps login light, authenticates a student, and opens a signed practice quiz', () => {
    let mathJaxRequests = 0;
    cy.intercept('GET', '**/mathjax*/**', (request) => {
      mathJaxRequests += 1;
      request.continue();
    });

    cy.intercept('POST', '**/api/student-login', {
      statusCode: 200,
      body: {
        status: 'success',
        data: {
          studentId: 'student-smoke',
          username: 'student-smoke',
          fullName: 'Học sinh Smoke',
          classId: 'class-smoke',
          className: 'Lớp 4A',
          coins: 0,
          pet: null,
          shopItems: [],
        },
      },
    }).as('studentLogin');
    cy.intercept('GET', '**/api/practice/topics', {
      statusCode: 200,
      body: { topics: [{ name: '#Toan', count: 1 }] },
    }).as('practiceTopics');
    cy.intercept('GET', '**/api/practice?*', {
      statusCode: 200,
      body: {
        id: 'practice-smoke',
        title: 'Ôn tập: Toán',
        classLevel: 'Tự do',
        category: 'Luyện tập',
        timeLimit: 0,
        isPractice: true,
        createdAt: '2026-07-26T00:00:00.000Z',
        practiceAttemptToken: 'signed-smoke-attempt',
        questions: [{
          id: 'q-smoke',
          quizId: 'practice-smoke',
          type: 'MCQ',
          question: '2 + 3 = ?',
          options: ['4', '5', '6'],
        }],
      },
    }).as('practiceQuiz');

    cy.visit('/');
    cy.get('form').should('be.visible');
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.lte(document.documentElement.clientWidth + 1);
    });
    cy.then(() => expect(mathJaxRequests, 'MathJax requests on login').to.equal(0));
    cy.wait(1_000);
    cy.window().then((win) => {
      const totalTransferredBytes = win.performance
        .getEntriesByType('resource')
        .filter((entry) => {
          const resource = entry as PerformanceResourceTiming;
          const url = new URL(resource.name);
          return url.origin === win.location.origin && !url.pathname.startsWith('/api/');
        })
        .reduce((total, entry) => {
          const resource = entry as PerformanceResourceTiming;
          return total + (resource.transferSize || resource.encodedBodySize || 0);
        }, 0);

      expect(totalTransferredBytes, 'login cold-load bytes').to.be.lte(1_000_000);
    });

    cy.get('[data-purpose="role-switcher"] button').first().click();
    cy.get('input[autocomplete="username"]').clear().type('student-smoke');
    cy.get('input[autocomplete="current-password"]').clear().type('Smoke-password-2026', { log: false });
    cy.get('button[type="submit"]').click();
    cy.wait('@studentLogin');

    cy.get('.student-dashboard', { timeout: 20_000 }).should('be.visible');
    cy.wait('@practiceTopics');
    cy.get('[data-testid="subject-practice-grid"] button').first().click();
    cy.get('#practice-topic-search', { timeout: 15_000 }).should('be.visible');
    cy.get('main .grid button').first().click();
    cy.wait('@practiceQuiz');
    cy.get('body').should('contain.text', '2 + 3 = ?');
  });
});
