import { useState } from "react";
import { API_URL } from "../util/constants";

export default function EventForm() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [response, setResponse] = useState(null);
  const [successMessage, setSuccessMessage] = useState(""); // ✅ State for success message

  const submitForm = async () => {
    try {
      const res = await fetch(`${API_URL}/events/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name }),
      });

      const data = await res.json();
      setResponse(data);

      if (res.ok) {
        setSuccessMessage("Event created successfully! ✅"); // ✅ Show success message
        setName(""); // ✅ Clear input fields
        setUrl("");

        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setSuccessMessage("Failed to create event ❌");
      }
    } catch (error) {
      console.error("Error submitting event:", error);
      setSuccessMessage("An error occurred ❌");
    }
  };

  return (
    <div style={styles.container}>
       <h2 style={{ 
            color: "white", 
            fontWeight: "bold", 
            fontSize: "24px", 
            textAlign: "right", 
            paddingRight: "190px"
        }}>
            Event Form
        </h2>
      <input
        type="text"
        placeholder="Event Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={styles.input}
      />
      <input
        type="text"
        placeholder="Event URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={styles.input}
      />
      <button onClick={submitForm} style={styles.button}>Submit</button>

      {/* ✅ Show Success Message */}
      {successMessage && <p style={styles.successMessage}>{successMessage}</p>}

      {/* ✅ Show API Response */}
      {response && <pre style={styles.response}>{JSON.stringify(response, null, 2)}</pre>}
    </div>
  );
}

// ✅ Updated CSS Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column" as "column", 
    alignItems: "flex-end" as "flex-end", 
    width: "100%",
    padding: "20px",
    paddingRight: "50px",
    boxSizing: "border-box",
    overflowX: "hidden",
  },
  input: {
    width: "300px",
    padding: "10px",
    fontSize: "16px",
    marginBottom: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    textAlign: "left" as "left", 
  },
  button: {
    width: "320px",
    padding: "10px",
    fontSize: "16px",
    backgroundColor: "white",
    color: "black",
    border: "1px solid black",
    borderRadius: "5px",
    cursor: "pointer",
    textAlign: "center" as "center",
  },
  response: {
    marginTop: "20px",
    textAlign: "right" as "right",
    maxWidth: "320px",
    whiteSpace: "pre-wrap",
  },
  successMessage: { // ✅ Added Success Message Styling
    color: "green",
    marginTop: "10px",
    fontSize: "16px",
    fontWeight: "bold",
  },
};