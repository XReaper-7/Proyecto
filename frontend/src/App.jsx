import { useEffect, useState } from "react";
import axios from "axios";

export default function App() {

  const [servers, setServers] = useState([]);
  const [backups, setBackups] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [currentView, setCurrentView] = useState("servers");
  const [loading, setLoading] = useState(false);
  const [intervalBackup, setIntervalBackup] = useState("*/5 * * * *");
  const [serverStatus, setServerStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {

    axios
      .get("http://localhost:3001/api/servers")
      .then((response) => {

        setServers(response.data.servers);

      })
      .catch((error) => {

        console.error(error);

      });

  }, []);
  
  useEffect(() => {
  const interval = setInterval(() => {
    if (currentView === "estado") {
      getStatus();
    }
  }, 5000);

  return () => clearInterval(interval);
}, [currentView]);

  /*
  |--------------------------------------------------------------------------
  | BACKUPS
  |--------------------------------------------------------------------------
  */

useEffect(() => {

  if (!selectedServer) return;

  axios
    .get(`http://localhost:3001/api/backups?server=${selectedServer.name}`)
    .then((response) => {

      setBackups(response.data.backups);

    })
    .catch((error) => {

      console.error(error);

    });

}, [selectedServer]);


const deleteBackup = async (backupName) => {
  if (!backupName) {
    alert("Backup no válido");
    return;
  }
  
    const confirmDelete = window.confirm(
    `⚠️ ATENCIÓN\n\nVas a eliminar el backup:\n${backupName}\n\n¿Quieres continuar?`
  );
  
  if (!confirmDelete) return;
 
  try {
    await axios.post(`http://localhost:3001/api/delete-backup?server=${selectedServer.name}`, {
      backup: backupName
    });

    alert("Backup eliminado");

    setBackups(prev =>
      prev.filter(b => b.name !== backupName)
    );

  } catch (err) {
    console.error(err);
    alert("Error eliminando backup");
  }
};

const Restore = async (backupName) => {
  if (!backupName) {
    alert("Backup no válido");
    return;
  }

  const confirmRestore = window.confirm(
    `⚠️ ATENCIÓN\n\nVas a restaurar el backup:\n${backupName}\n\nEsto sobrescribirá la base de datos.\n\n¿Quieres continuar?`
  );

  if (!confirmRestore) return;

  try {

    console.log("Restaurando:", backupName);

    const res = await axios.post(`http://localhost:3001/api/restore?server=${selectedServer.name}`, {
      backup: backupName
    });

    console.log("RESPUESTA:", res.data);

    alert("Restauración completada correctamente");

  } catch (err) {
    console.error("ERROR RESTORE:", err.response?.data || err.message);
    alert("Error restaurando backup");

  } finally {
    setLoading(false);
  }
};

const handleSaveInterval = async () => {
  try {
    const res = await axios.post(`http://localhost:3001/api/set-backup-interval?server=${selectedServer.name}`, {
      interval: intervalBackup
    });

    console.log("Respuesta backend:", res.data);
    alert("Intervalo actualizado correctamente");

  } catch (err) {
    console.error("Error guardando intervalo:", err);
    alert("Error al actualizar el intervalo");
  }
};

  /*
  |--------------------------------------------------------------------------
  | INSTALACION
  |--------------------------------------------------------------------------
  */
  
const handleInstall = async () => {

  const confirmInstall = window.confirm(
    `Instalar archivos y dependencias en ${selectedServer.name}?`
  );

  if (!confirmInstall) return;

  try {

    const res = await axios.post(
      `http://localhost:3001/api/install?server=${selectedServer.name}`
    );

    console.log(res.data);

    alert("Instalación completada, la contraseña por defecto es: 1234");

  } catch (err) {

    console.error(err);

    alert("Error instalando");

  }

};

const handleDelete = async () => {

  const confirmInstall = window.confirm(
    `Advertencia, esto eliminara los archivos de la base de datos de ${selectedServer.name}?`
  );

  if (!confirmInstall) return;

  try {

    const res = await axios.post(
      `http://localhost:3001/api/delete?server=${selectedServer.name}`
    );

    console.log(res.data);

    alert("Se han eliminado correctamente los datos del servidor");

  } catch (err) {

    console.error(err);

    alert("Error eliminando");

  }

};

  /*
  |--------------------------------------------------------------------------
  | EXPONER SERVIDOR
  |--------------------------------------------------------------------------
  */

const exponer = async () => {

  try {

    const res = await axios.post(
      `http://localhost:3001/api/exponer?server=${selectedServer.name}`
    );

    console.log(res.data);

    alert(`Se ha abierto el servidor: ip ${selectedServer.ip} puerto 30306`);

  } catch (err) {

    console.error(err);

    alert("Error abriendo el servidor");

  }

};


  /*
  |--------------------------------------------------------------------------
  | ESTADO
  |--------------------------------------------------------------------------
  */

const getStatus = async () => {
  const res = await axios.get(
    `http://localhost:3001/api/status?server=${selectedServer.name}&ip=${selectedServer.ip}`
  );

  setServerStatus(res.data);
};

  /*
  |--------------------------------------------------------------------------
  | LOGS
  |--------------------------------------------------------------------------
  */

const getLogs = async () => {
  const res = await axios.get(
    `http://localhost:3001/api/logs?server=${selectedServer.name}`
  );

  setLogs(res.data.logs);
};

  /*
  |--------------------------------------------------------------------------
  | VISTAS
  |--------------------------------------------------------------------------
  */

if (currentView === "backups") {

  return (

    <div className="min-h-screen bg-gray-200 p-8">

      <div className="max-w-6xl mx-auto">

        <button
          onClick={() => setCurrentView("server")}
          className="mb-6 bg-gray-300 text-black hover:bg-gray-400 px-4 py-2 rounded-xl"
        >
          ← Volver
        </button>

        <div className="bg-white border border-gray-300 rounded-3xl shadow-lg p-8 mb-8">

          <h1 className="text-4xl font-bold text-black mb-2">
            Backups
          </h1>

          <p className="text-gray-700">
            {selectedServer.name}
          </p>

        </div>

        <div className="bg-white border border-gray-300 rounded-3xl shadow-lg p-8">

          <div className="space-y-4">

            <div className="border rounded-2xl p-4 flex justify-between items-center">

             <div className="space-y-4">

  {backups.map((backup, index) => (

    <div
      key={index}
      className="border rounded-2xl p-4 flex justify-between items-center"
    >

      <div>

        <h2 className="font-bold">
          {backup.name}
        </h2>

      </div>

      <div className="flex gap-3">

        <button onClick={() => Restore(backup.name)} className="bg-blue-600 text-white px-4 py-2 rounded-xl">
		  Restaurar
	</button>

        <button onClick={() => deleteBackup(backup.name)} className="bg-red-600 text-white px-4 py-2 rounded-xl">
		  Eliminar
	</button>

      </div>

    </div>

  ))}

</div>

              <div className="flex gap-3">

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

if (currentView === "configuracion") {

  return (

    <div className="min-h-screen bg-gray-200 p-8">

      <div className="max-w-6xl mx-auto">

        <button
          onClick={() => setCurrentView("server")}
          className="mb-6 bg-gray-300 text-black hover:bg-gray-400 px-4 py-2 rounded-xl"
        >
          ← Volver
        </button>

        <div className="bg-white border border-gray-300 rounded-3xl shadow-lg p-8 mb-8">

          <h1 className="text-4xl font-bold text-black mb-2">
            Configuración
          </h1>

          <p className="text-gray-700">
            {selectedServer.name}
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <button
            onClick={() => setCurrentView("intervalos")}
            className="bg-white border border-gray-300 p-6 rounded-2xl shadow hover:scale-[1.02] transition text-left"
          >

            <h2 className="text-2xl font-bold mb-2 text-black">
              Intervalos de backups
            </h2>

            <p className="text-gray-700">
              Cambiar frecuencia de backups automáticos
            </p>

          </button>

          <button
            onClick={() => setCurrentView("install")}
            className="bg-white border border-gray-300 p-6 rounded-2xl shadow hover:scale-[1.02] transition text-left">

            <h2 className="text-2xl font-bold mb-2 text-black">
              Instalación
            </h2>

            <p className="text-gray-700">
              Instalar o borrar servidor
            </p>

          </button>

        </div>

      </div>

    </div>
  );
}

if (currentView === "intervalos") {

  return (

    <div className="min-h-screen bg-gray-200 p-8">

      <div className="max-w-6xl mx-auto">

        <button
          onClick={() => setCurrentView("configuracion")}
          className="mb-6 bg-gray-300 text-black hover:bg-gray-400 px-4 py-2 rounded-xl"
        >
          ← Volver
        </button>

        <div className="bg-white border border-gray-300 rounded-3xl shadow-lg p-8 mb-8">

          <h1 className="text-4xl font-bold text-black mb-4">
            Intervalos de backups
          </h1>

          <p className="text-gray-700 mb-6">
            Selecciona cada cuánto quieres ejecutar los backups automáticos
          </p>

          <select
            onChange={(e) => setIntervalBackup(e.target.value)}
            className="border border-gray-300 p-3 rounded-xl w-full"
          >
            <option value="*/5 * * * *">Cada 5 minutos</option>
            <option value="*/10 * * * *">Cada 10 minutos</option>
            <option value="0 * * * *">Cada hora</option>
            <option value="0 0 * * *">Cada día</option>
          </select>

          <button
            onClick={handleSaveInterval}
            className="mt-6 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700"
          >
            Guardar intervalo
          </button>

        </div>

      </div>

    </div>

  );
}

if (currentView === "install") {

  return (

    <div className="min-h-screen bg-gray-200 p-8">

      <div className="max-w-6xl mx-auto">

        <button
          onClick={() => setCurrentView("configuracion")}
          className="mb-6 bg-gray-300 text-black hover:bg-gray-400 px-4 py-2 rounded-xl"
        >
          ← Volver
        </button>

        <div className="bg-white border border-gray-300 rounded-3xl shadow-lg p-8 mb-8">

          <h1 className="text-4xl font-bold text-black mb-2">
            Instalación
          </h1>

          <p className="text-gray-700">
            Gestionar servidor
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <button
            className="bg-white border border-gray-300 p-6 rounded-2xl shadow hover:scale-[1.02] transition text-left" onClick={handleInstall}>

            <h2 className="text-2xl font-bold mb-2 text-black">
              Instalar servidor
            </h2>

            <p className="text-gray-700">
              Instalar dependencias automáticamente
            </p>

          </button>

          <button
            className="bg-white border border-gray-300 p-6 rounded-2xl shadow hover:scale-[1.02] transition text-left" onClick={handleDelete}>

            <h2 className="text-2xl font-bold mb-2 text-black">
              Eliminar servidor
            </h2>

            <p className="text-gray-700">
              Borrar servidor de la infraestructura
            </p>

          </button>

        </div>

      </div>

    </div>

  );
}

if (currentView === "estado") {
  return (
    <div className="min-h-screen bg-gray-200 p-8">
      <div className="max-w-6xl mx-auto">

        <button
          onClick={() => setCurrentView("server")}
          className="mb-6 bg-gray-300 px-4 py-2 rounded-xl"
        >
          ← Volver
        </button>

        <div className="bg-white p-8 rounded-3xl shadow-lg">

          <h1 className="text-3xl font-bold mb-6">
            Estado del servidor
          </h1>

          <button
            onClick={getStatus}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl mb-6">
            Actualizar estado
          </button>

        {serverStatus && (
  <div>
    <p>Nombre: {selectedServer.name}</p>
    <p>IP: {serverStatus.ip}</p>

    <p>
      Online:{" "}
      {serverStatus?.status?.online ? "🟢 SI" : "🔴 NO"}
    </p>

    <p>
      Puerto 30306:{" "}
      {serverStatus?.status?.port_30306 ? "🟢 ABIERTO" : "🔴 CERRADO"}
    </p>
  </div>
)}

        </div>
      </div>
    </div>
  );
}

if (currentView === "logs") {
  return (
    <div className="min-h-screen bg-gray-200 p-8">
      <div className="max-w-6xl mx-auto">

        <button
          onClick={() => setCurrentView("server")}
          className="mb-6 bg-gray-300 px-4 py-2 rounded-xl"
        >
          ← Volver
        </button>

        <div className="bg-white p-8 rounded-3xl shadow-lg">

          <h1 className="text-3xl font-bold mb-6">
            Logs del sistema
          </h1>

          <button
            onClick={getLogs}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl mb-6"
          >
            Actualizar logs
          </button>

          <div className="space-y-4">

            {logs.map((log, index) => (
              <div
                key={index}
                className="border p-4 rounded-xl"
              >

                <p className="text-sm text-gray-500">
                  {log.time}
                </p>

                <p className="font-bold">
                  {log.server} → {log.action}
                </p>

                <pre className="text-sm bg-gray-100 p-2 rounded-xl overflow-auto">
                  {log.output}
                </pre>

                {log.error && (
                  <p className="text-red-600 font-bold">
                    ERROR
                  </p>
                )}

              </div>
            ))}

          </div>

        </div>
      </div>
    </div>
  );
}

  /*
  |--------------------------------------------------------------------------
  | PANEL SERVIDOR
  |--------------------------------------------------------------------------
  */

  if (selectedServer) {

    return (

      <div className="min-h-screen bg-gray-200 p-8">

        <div className="max-w-6xl mx-auto">

          <div className="bg-white border border-gray-300 rounded-3xl shadow-lg p-8 mb-8">

            <button
              onClick={() => setSelectedServer(null)}
              className="mb-6 bg-gray-300 text-black hover:bg-gray-400 px-4 py-2 rounded-xl"
            >
              ← Volver
            </button>

            <div className="flex items-center justify-between">

              <div>

                <h1 className="text-4xl font-bold text-black mb-2">
                  {selectedServer.name}
                </h1>

                <p className="text-gray-700">
                  {selectedServer.ip}
                </p>

              </div>

              <div className="flex items-center gap-3">

              </div>

            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

           <button onClick={() => setCurrentView("backups")} className="bg-white border border-gray-300 p-8 rounded-3xl shadow-lg text-left hover:scale-[1.02] transition">

              <h2 className="text-2xl font-bold mb-3">
                Backups
              </h2>

              <p className="text-gray-700">
                Ver backups y restaurar bases de datos
              </p>

            </button>

            <button onClick={() => setCurrentView("configuracion")} className="bg-white border border-gray-300 p-8 rounded-3xl shadow-lg text-left hover:scale-[1.02] transition">

              <h2 className="text-2xl font-bold mb-3">
                Configuración
              </h2>

              <p className="text-gray-700">
                Intervalos, Restaurar Servidor
              </p>

            </button>


            <button className="bg-white border border-gray-300 p-8 rounded-3xl shadow-lg text-left hover:scale-[1.02] transition" onClick={() => setCurrentView("estado")}>

              <h2 className="text-2xl font-bold mb-3">
                Estado
              </h2>

              <p className="text-gray-700">
                Recursos y estado del servidor
              </p>

            </button>

            <button className="bg-white border border-gray-300 p-8 rounded-3xl shadow-lg text-left hover:scale-[1.02] transition">

              <h2 className="text-2xl font-bold mb-3" onClick={() => setCurrentView("logs")}>
                Logs
              </h2>

              <p className="text-gray-700">
                Ver logs del sistema
              </p>

            </button>

            <button className="bg-white border border-gray-300 p-8 rounded-3xl shadow-lg text-left hover:scale-[1.02] transition" onClick={exponer}>

              <h2 className="text-2xl font-bold mb-3">
                Abrir mariadb
              </h2>

              <p className="text-gray-700">
                Abrir el puerto de mariadb
              </p>

            </button>

          </div>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | LISTA SERVIDORES
  |--------------------------------------------------------------------------
  */

  return (

    <div className="min-h-screen bg-gray-200 p-8 text-gray-900">

      <div className="max-w-6xl mx-auto">

        <div className="bg-white border border-gray-300 rounded-3xl shadow-lg p-8 mb-8">

          <h1 className="text-4xl font-bold text-black mb-3">
            Lista de servidores
          </h1>

          <p className="text-gray-800">
            Selecciona un servidor
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {servers.map((server, index) => (

            <div
              key={index}
              onClick={() => {
 		 setSelectedServer(server);
 		 setCurrentView("server");
		}}
              className="bg-white border border-gray-300 rounded-3xl shadow-lg p-8 cursor-pointer hover:scale-[1.02] transition"
            >

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-2xl font-bold mb-2">
                    {server.name}
                  </h2>

                  <p className="text-gray-700">
                    {server.ip}
                  </p>

                </div>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}
