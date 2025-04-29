// eventform.tsx
import { useState } from "react";
import { API_URL } from "../util/constants";

export default function EventForm() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [row, setRow] = useState(""); // New: row input
  const [section, setSection] = useState("center"); // New: section dropdown (default "center")
  const [groupSize, setGroupSize] = useState(1); // New: group size input
  const [response, setResponse] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const submitForm = async () => {
    try {
      const res = await fetch(`${API_URL}/events/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, row, section, groupSize }),
      });

      const data = await res.json();
      setResponse(data);

      if (res.ok) {
        setSuccessMessage("Event created successfully! ✅");
        // Clear fields
        setName("");
        setUrl("");
        setRow("");
        setSection("center");
        setGroupSize(1);

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
      <input
        type="text"
        placeholder="Row (e.g., M)"
        value={row}
        onChange={(e) => setRow(e.target.value)}
        style={styles.input}
      />
      <select 
        value={section} 
        onChange={(e) => setSection(e.target.value)}
        style={styles.input}
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
      <input
        type="number"
        placeholder="Group Size"
        value={groupSize}
        onChange={(e) => setGroupSize(Number(e.target.value))}
        style={styles.input}
      />
      <button onClick={submitForm} style={styles.button}>Submit</button>
      {successMessage && <p style={styles.successMessage}>{successMessage}</p>}
      {response && <pre style={styles.response}>{JSON.stringify(response, null, 2)}</pre>}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column", 
    alignItems: "flex-end", 
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
    textAlign: "left", 
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
    textAlign: "center",
  },
  response: {
    marginTop: "20px",
    textAlign: "right",
    maxWidth: "320px",
    whiteSpace: "pre-wrap",
  },
  successMessage: {
    color: "green",
    marginTop: "10px",
    fontSize: "16px",
    fontWeight: "bold",
  },
};