function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>DATATHON</h3>
          <p>Data Science Competition Platform</p>
        </div>
        
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/home">Home</a></li>
            <li><a href="/competition">Competition Info</a></li>
            <li><a href="/leaderboard">Leaderboard</a></li>
            <li><a href="/chat">Community Chat</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Resources</h4>
          <ul>
            <li><a href="/submissions">My Submissions</a></li>
            <li><a href="/profile">Profile</a></li>
            <li><a href="/dashboard">Upload</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Contact</h4>
          <p>Email: geeksforgeeks@pccoepune.org</p>
          <p>PCCOE Pune</p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} DATATHON - PCCOE GeeksforGeeks. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
