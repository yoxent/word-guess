module.exports = {
  isAuthenticated: jest.fn(async () => false),
  signInWithFirebase: jest.fn(async () => {
    throw new Error('Play Games mock — not signed in');
  }),
  signOutFirebase: jest.fn(async () => {}),
};
