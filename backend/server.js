const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

  /*
  |--------------------------------------------------------------------------
  | VER BACKUPS
  |--------------------------------------------------------------------------
  */
  
app.get("/api/backups", (req, res) => {

  exec(
    "ANSIBLE_FORCE_COLOR=false ansible-playbook -i ../ansible/hosts ../ansible/lista_backups.yml",
    (error, stdout, stderr) => {

      if (error) {

        return res.status(500).json({
          success: false,
          error: error.message
        });

      }

      const regex = /backup-[0-9-]+\.sql/g;

      const matches = stdout.match(regex) || [];

      const backups = matches.map(name => ({
        name
      }));

      res.json({
        success: true,
        backups
      });

    }
  );
});

  /*
  |--------------------------------------------------------------------------
  | RESTAURAR BACKUPS
  |--------------------------------------------------------------------------
  */
  
app.post("/api/restore", express.json(), (req, res) => {

  const backup = req.body.backup;

  if (!backup) {
    return res.status(400).json({
      success: false,
      error: "Backup no especificado"
    });
  }

  const cmd = `
ANSIBLE_FORCE_COLOR=false \
ansible-playbook \
-i ../ansible/hosts ../ansible/restaurar.yml \
--extra-vars "backup_name=${backup}"
`;

  exec(cmd, (error, stdout, stderr) => {
  
    if (error) {
      return res.status(500).json({
        success: false,
        error: stderr || error.message,
        output: stdout
      });
    }

    res.json({
      success: true,
      output: stdout
    });

  });

});

  /*
  |--------------------------------------------------------------------------
  | ELIMINAR BACKUPS
  |--------------------------------------------------------------------------
  */
  
app.post("/api/delete-backup", express.json(), (req, res) => {

  const backup = req.body.backup;

  if (!backup) {
    return res.status(400).json({
      success: false,
      error: "Backup no especificado"
    });
  }

  const cmd = `
ANSIBLE_FORCE_COLOR=false \
ansible-playbook \
-i ../ansible/hosts ../ansible/eliminar_backup.yml \
--extra-vars "backup_name=${backup}"
`;

  exec(cmd, (error, stdout, stderr) => {

    if (error) {
      return res.status(500).json({
        success: false,
        error: stderr || error.message,
        output: stdout
      });
    }

    res.json({
      success: true,
      output: stdout
    });

  });

});

  /*
  |--------------------------------------------------------------------------
  | ACTUALIZAR INTERVALO BACKUPS
  |--------------------------------------------------------------------------
  */

app.post("/api/set-backup-interval", express.json(), (req, res) => {

  const interval = req.body.interval;

  const cmd = `
ansible-playbook -i ../ansible/hosts ../ansible/actualizar_intervalo.yml \
--extra-vars "interval='${interval}'"
`;

  exec(cmd, (err, stdout, stderr) => {

    if (err) {
      return res.status(500).json({
        error: stderr || err.message
      });
    }

    res.json({
      success: true,
      output: stdout
    });

  });
});

  /*
  |--------------------------------------------------------------------------
  | VER SERVERS
  |--------------------------------------------------------------------------
  */
  
app.get("/api/servers", (req, res) => {

  exec(
    "ansible-inventory -i ../ansible/hosts --list",
    (error, stdout, stderr) => {

      if (error) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }

      try {

        const inventory = JSON.parse(stdout);

        const hosts =
          inventory.servidores.hosts || [];

        const servers = hosts.map((host) => {

          return {
            name: host
          };

        });

        res.json({
          success: true,
          servers
        });

      } catch (e) {

        res.status(500).json({
          success: false,
          error: e.message
        });

      }

    }
  );
});

app.listen(3001, () => {
  console.log("Servidor iniciado en puerto 3001");
});
