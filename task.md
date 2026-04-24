I just tested the launch instance again, it launches the instance and the ui keeps polling informations, when i see inside the vcenter the vm is up and it has ip address, i press refresh and this returns the ip address correctly tho it doesnt send provide the guacamole_connections: {} fields, this is the return response:
connection_url: "http://localhost:8081/guacamole/#/client/5"
created_at: "2026-04-23T22:09:59.372354Z"
expires_at: "2026-04-24T02:09:59.268903Z"
guacamole_connection_id: "5"
guacamole_connections: {}
id: "b55cb005-0dd4-490f-b77e-7ade3b5448dd"
ip_address: "172.20.11.121"
lab_definition_id: "6513b23f-ef9f-4469-a7a0-4f6b187c396c"
power_state: "poweredOn"
started_at: "2026-04-23T22:09:59.268874Z"
status: "provisioning"
stopped_at: null
trainee_id: "d9d6875d-5b0b-438d-aef1-ac29188b34ab"
vcenter_host: "sa-vcsa-01.vclass.local"
vm_name: "sql-fundamentals-d9d6875d-e2ecc262"
vm_uuid: "42282942-d6a6-bad9-6143-a79bdf16e174"

I open guacamole web ui: localhost:8081/guacamole/# and connect using guacadmin/guacdmin and find 2 connections correctly there and they are created correctly since i can connect when i try using ssh with the correct credentials from the vault. so the issue is the settings passed into the response data. also when i try to terminate it only terminates the vcenter vm but keeps the connections in guacamole and i guess because the guacamole_connections:{} is empty.

goal: identify the issues and provide a fix, if you need any refrence context files ask before making any doubtful decisions