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

  const server = req.query.server;

  exec(
    `ANSIBLE_FORCE_COLOR=false ansible-playbook -i ../ansible/hosts ../ansible/lista_backups.yml --limit ${server}`,
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
  const server = req.query.server;

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
--extra-vars "backup_name=${backup}" --limit ${server}
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
  const server = req.query.server;

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
--extra-vars "backup_name=${backup}" --limit ${server}
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
  const server = req.query.server;

  const cmd = `
ansible-playbook -i ../ansible/hosts ../ansible/actualizar_intervalo.yml \
--extra-vars "interval='${interval}'" --limit ${server} 
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
  | CREAR REPLICA
  |--------------------------------------------------------------------------
  */

app.post("/api/replica", (req, res) => {

  const server = req.query.server;
  const target = req.body.target;

  console.log("SOURCE:", server);
  console.log("TARGET:", target);

  const cmd = `
ansible-playbook -i ../ansible/hosts ../ansible/replica.yml \
--extra-vars '{"source":"${server}","target":"${target}"}'
`;

  console.log("CMD:", cmd);

  exec(cmd, (error, stdout, stderr) => {

    console.log("STDOUT:", stdout);
    console.log("STDERR:", stderr);

    if (error) {
      console.log("ERROR:", error.message);

      return res.status(500).json({
        success: false,
        error: stderr || error.message
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
  | BORRAR REPLICA
  |--------------------------------------------------------------------------
  */

app.post("/api/replica-delete", (req, res) => {

  const source = req.query.server;
  const target = req.body.target;

  const cmd = `
ansible-playbook -i ../ansible/hosts ../ansible/replica_remove.yml \
--extra-vars "source=${source} target=${target}"
`;

  exec(cmd, (error, stdout, stderr) => {

    if (error) {
      return res.status(500).json({
        success: false,
        error: stderr || error.message
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

            name: host,

            ip: inventory._meta.hostvars[host].ansible_host

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

  /*
  |--------------------------------------------------------------------------
  | EXPONER SERVIDOR
  |--------------------------------------------------------------------------
  */

app.post("/api/exponer", (req, res) => {

  const server = req.query.server;

  exec(`
    ansible-playbook -i ../ansible/hosts \
    ../ansible/exponer.yml --limit ${server}
  `,

  (error, stdout, stderr) => {

    if (error) {
      return res.status(500).json({
        error: stderr
      });
    }

    res.json({
      output: stdout
    });

  });

});

  /*
  |--------------------------------------------------------------------------
  | INSTALAR SERVIDOR
  |--------------------------------------------------------------------------
  */

app.post("/api/install", (req, res) => {

  const server = req.query.server;

  exec(`
    ansible-playbook -i ../ansible/hosts \
    ../ansible/install.yml --limit ${server}
  `,

  (error, stdout, stderr) => {

    if (error) {
      return res.status(500).json({
        error: stderr
      });
    }

    res.json({
      output: stdout
    });

  });

});

app.post("/api/delete", (req, res) => {

  const server = req.query.server;

  exec(`
    ansible-playbook -i ../ansible/hosts \
    ../ansible/delete.yml --limit ${server}
  `,

  (error, stdout, stderr) => {

    if (error) {
      return res.status(500).json({
        error: stderr
      });
    }

    res.json({
      output: stdout
    });

  });

});

app.listen(3001, () => {
  console.log("Servidor iniciado en puerto 3001");
});
