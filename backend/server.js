const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

app.get("/api/backups", (req, res) => {

  exec(
    "ansible-playbook -i ../ansible/hosts ../ansible/lista_backups.yml",
    (error, stdout, stderr) => {

      console.log("ERROR:", error);
      console.log("STDOUT:", stdout);
      console.log("STDERR:", stderr);

      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
          stdout: stdout,
          stderr: stderr
        });
      }

      res.json({
        success: true,
        output: stdout
      });
    }
  );
});

app.listen(3001, () => {
  console.log("Servidor iniciado en puerto 3001");
});
