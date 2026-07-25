import React from 'react';
import { StudentFloatingSidebar } from '../../src/components/gamification/StudentFloatingSidebar';
import { useGamificationStore } from '../../src/stores/useGamificationStore';

const students = Array.from({ length: 10 }, (_, index) => ({
  username: `student-${index + 1}`,
  fullName: `Học sinh ${index + 1}`,
  avatar: '',
  coins: 1000 - index * 50,
}));

const mountLeaderboard = () => {
  useGamificationStore.setState({
    topGoldLeaderboard: students,
    topGoldLeaderboardLoading: false,
    topGoldLeaderboardError: null,
    topGoldLeaderboardFetchedAt: Date.now(),
    fetchTopGoldLeaderboard: async () => undefined,
  });
  cy.mount(
    <div className="min-h-dvh bg-[#FFFDF7]">
      <StudentFloatingSidebar currentUsername="student-4" />
    </div>,
  );
};

const assertNoHorizontalOverflow = () => {
  cy.document().then((document) => {
    expect(document.documentElement.scrollWidth).to.be.lte(document.documentElement.clientWidth + 1);
  });
};

describe('student gold leaderboard visual behavior', () => {
  it('renders a centered modal on desktop', () => {
    cy.viewport(1440, 900);
    mountLeaderboard();
    cy.get('button[aria-label="Mở Bảng vàng học sinh"]').click();
    cy.get('section[role="dialog"][aria-label="Bảng vàng học sinh"]').should('be.visible');
    cy.contains('Học sinh 1').should('be.visible');
    cy.contains('Em').should('be.visible');
    assertNoHorizontalOverflow();
  });

  it('renders a bottom sheet without overflow on mobile', () => {
    cy.viewport(360, 800);
    mountLeaderboard();
    cy.get('button[aria-label="Mở Bảng vàng học sinh"]')
      .should('have.css', 'height', '56px')
      .click();
    cy.get('section[role="dialog"][aria-label="Bảng vàng học sinh"]').should('be.visible');
    cy.get('button[aria-label="Đóng Bảng vàng"]').should('be.visible');
    assertNoHorizontalOverflow();
  });
});
