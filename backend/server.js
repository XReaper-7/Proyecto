const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const net = require("net");
let logs = [];
const fs = require("fs");
const path = require("path");
const LOG_FILE = path.join(__dirname, "..", "logs", "logs.json");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

if (fs.existsSync(LOG_FILE)) {
  try {
    logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
  } catch (e) {
    logs = [];
  }
}

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
  
    addLog(server, "RESTORE", stdout || stderr, !!error);
  
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

  addLog(server, "DELETE-BACKUP", stdout || stderr, !!error);

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

  addLog(server, "BACKUP-UPDATE", stdout || stderr, !!err);

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

  addLog(server, "INSTALL", stdout || stderr, !!error);

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

  addLog(server, "DELETE", stdout || stderr, !!error);

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

  /*
  |--------------------------------------------------------------------------
  | COMPROBAR ESTADO
  |--------------------------------------------------------------------------
  */

function checkHost(ip) {
  return new Promise((resolve) => {
    exec(`ping -c 1 -W 1 ${ip}`, (error) => {
      resolve(!error);
    });
  });
}

function checkPort(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const timeout = 1000;

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, ip);
  });
}

app.get("/api/status", async (req, res) => {

  const { server, ip } = req.query;

  if (!ip) {
    return res.status(400).json({
      success: false,
      error: "IP no proporcionada"
    });
  }

  try {

    const isUp = await checkHost(ip);
    const portOpen = await checkPort(ip, 30306);

    res.json({
      success: true,
      server,
      ip,
      status: {
        online: isUp,
        port_30306: portOpen
      }
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

});

  /*
  |--------------------------------------------------------------------------
  | LOGS
  |--------------------------------------------------------------------------
  */
  
app.get("/api/logs", (req, res) => {
  const server = req.query.server;

  const filtered = server
    ? logs.filter(l => l.server === server)
    : logs;

  res.json({
    success: true,
    logs: [...filtered].reverse()
  });
});

function addLog(server, action, output, error = false) {
  const logEntry = {
    time: new Date().toISOString(),
    server,
    action,
    output,
    error
  };

  logs.push(logEntry);

  if (logs.length > 200) {
    logs.shift();
  }

  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}
