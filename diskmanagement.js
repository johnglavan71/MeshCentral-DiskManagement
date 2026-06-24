"use strict";

module.exports.diskmanagement = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.meshServer = parent.parent;

    obj.exports = [
      'registerPluginTab',
      'on_device_page',
      'onDeviceRefreshEnd',
      'renderDisks',
      'formatBytes',
      'loadDisksData'
    ];

    obj.registerPluginTab = function() {
      if (typeof currentNode === 'undefined' || currentNode == null) return { tabId: null, tabTitle: null };
      if (currentNode.osdesc.toLowerCase().indexOf('windows') === -1) return { tabId: null, tabTitle: null };
      return { tabId: 'pluginDiskManagement', tabTitle: 'Disk Management' };
    };

    obj.on_device_page = function() {
        return '<div id=pluginDiskManagement></div>';
    };

    obj.loadDisksData = function(server, message) {
        try {
            var data = (typeof message === 'string') ? JSON.parse(message) : message;
            if (data.error) {
                QH('pluginDiskManagement', '<div style="padding: 10px; color: red;">Error: ' + data.error + '</div>');
            } else {
                pluginHandler.diskmanagement.renderDisks(data.data);
            }
        } catch(e) {
            QH('pluginDiskManagement', '<div style="padding: 10px; color: red;">Frontend Error: ' + e.toString() + '</div>');
        }
    };

    obj.onDeviceRefreshEnd = function(nodeid, panel, refresh, event) {
      if (typeof currentNode === 'undefined' || currentNode == null) return;
      if (currentNode.osdesc.toLowerCase().indexOf('windows') === -1) return;
      
      pluginHandler.registerPluginTab(pluginHandler.diskmanagement.registerPluginTab());
      try { QH('pluginDiskManagement', '<div style="padding: 10px;">Loading disk information...</div>'); } catch(e) { } 
      
      if (currentNode && currentNode.conn) {
          meshserver.send({ 
              action: 'plugin', 
              plugin: 'diskmanagement', 
              pluginaction: 'getdisks',
              nodeid: currentNode._id 
          });
      }
    };

    obj.serveraction = function(command, myparent, grandparent) {
        if (command.plugin !== 'diskmanagement') return;
        
        var fs = require('fs');
        try { fs.appendFileSync(obj.parent.parent.datapath + '/dm_server_log.txt', 'SERVERACTION: received ' + command.pluginaction + ' for node: ' + command.nodeid + '\n'); } catch(e) {}
        
        var sessionid = null;
        try { sessionid = myparent.ws.sessionId; } catch (e) {}

        switch(command.pluginaction) {
            case 'getdisks':
                try {
                    if (obj.meshServer.webserver.wsagents[command.nodeid]) {
                        try { fs.appendFileSync(obj.parent.parent.datapath + '/dm_server_log.txt', 'SERVERACTION: agent found, sending command.\n'); } catch(e) {}
                        obj.meshServer.webserver.wsagents[command.nodeid].send(JSON.stringify({
                            action: 'plugin',
                            plugin: 'diskmanagement',
                            pluginaction: 'getdisks',
                            sessionid: sessionid
                        }));
                    } else {
                        try { fs.appendFileSync(obj.parent.parent.datapath + '/dm_server_log.txt', 'SERVERACTION: AGENT NOT FOUND IN wsagents!\n'); } catch(e) {}
                    }
                } catch(e) {
                    try { fs.appendFileSync(obj.parent.parent.datapath + '/dm_server_log.txt', 'SERVERACTION: Exception: ' + e + '\n'); } catch(err) {}
                }
                break;
            case 'getdisksResult':
                try { fs.appendFileSync(obj.parent.parent.datapath + '/dm_server_log.txt', 'SERVERACTION: got Result from agent!\n'); } catch(e) {}
                var targetSessionid = command.sessionid;
                var response = {
                    action: 'plugin',
                    plugin: 'diskmanagement',
                    method: 'loadDisksData',
                    data: command.data,
                    error: command.error,
                    nodeid: command.nodeid
                };
                if (targetSessionid && obj.meshServer.webserver.wssessions2 && obj.meshServer.webserver.wssessions2[targetSessionid]) {
                    try {
                        obj.meshServer.webserver.wssessions2[targetSessionid].send(JSON.stringify(response));
                        try { fs.appendFileSync(obj.parent.parent.datapath + '/dm_server_log.txt', 'SERVERACTION: sent Result to browser session ' + targetSessionid + '!\n'); } catch(e) {}
                    } catch (e) {
                        try { fs.appendFileSync(obj.parent.parent.datapath + '/dm_server_log.txt', 'SERVERACTION: failed to send Result to browser!\n'); } catch(e) {}
                    }
                } else {
                    try { fs.appendFileSync(obj.parent.parent.datapath + '/dm_server_log.txt', 'SERVERACTION: browser session not found!\n'); } catch(e) {}
                }
                break;
        }
    };

    obj.renderDisks = function(data) {
        if (!data || (!data.disks && !data.volumes)) {
            QH('pluginDiskManagement', '<div style="padding: 10px; color: red;">Error: Invalid data received from endpoint.</div>');
            return;
        }
        var html = '<style>';
        html += '#pluginDiskManagement { padding: 10px; font-family: "Trebuchet MS", Arial, Helvetica, sans-serif; height: calc(100vh - 250px); overflow-y: auto; box-sizing: border-box; }';
        html += '.dm-table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }';
        html += '.dm-table th, .dm-table td { border: 1px solid rgba(127,127,127,0.3); padding: 8px; text-align: left; }';
        html += '.dm-table th { background-color: rgba(127,127,127,0.1); }';
        html += '.dm-table tr:nth-child(even) { background-color: rgba(127,127,127,0.1); }';
        html += '.dm-disk-container { display: flex; border: 1px solid rgba(127,127,127,0.3); margin-bottom: 10px; }';
        html += '.dm-disk-info { width: 150px; min-width: 150px; padding: 10px; border-right: 1px solid rgba(127,127,127,0.3); background-color: rgba(127,127,127,0.05); }';
        html += '.dm-disk-parts { display: flex; flex-grow: 1; padding: 10px; gap: 5px; flex-wrap: wrap; }';
        html += '.dm-part { border: 1px solid rgba(127,127,127,0.5); border-top: 5px solid #005A9E; padding: 10px; min-width: 50px; background-color: rgba(127,127,127,0.05); text-align: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }';
        html += '</style>';
        
        html += '<h3>Volume Summary</h3>';
        html += '<table class="dm-table">';
        html += '<tr><th>Volume</th><th>Layout</th><th>Type</th><th>File System</th><th>Status</th><th>Capacity</th><th>Free Space</th><th>% Free</th></tr>';
        
        if (data.volumes) {
            for(var i=0; i<data.volumes.length; i++) {
                var vol = data.volumes[i];
                var letter = vol.DriveLetter ? (vol.DriveLetter + ':\\') : '';
                var label = vol.FileSystemLabel || '';
                var volName = (label + ' (' + letter + ')').replace(' ()', '').trim();
                var type = 'Basic'; 
                var fs = vol.FileSystem || '';
                var status = vol.HealthStatus || 'Healthy';
                var cap = pluginHandler.diskmanagement.formatBytes(vol.Size);
                var free = pluginHandler.diskmanagement.formatBytes(vol.SizeRemaining);
                var pctFree = vol.Size > 0 ? Math.round((vol.SizeRemaining / vol.Size) * 100) : 0;
                
                html += '<tr><td>'+volName+'</td><td>Simple</td><td>'+type+'</td><td>'+fs+'</td><td>'+status+'</td><td>'+cap+'</td><td>'+free+'</td><td>'+pctFree+'%</td></tr>';
            }
        } else {
            html += '<tr><td colspan="8">No volumes found.</td></tr>';
        }
        html += '</table>';
        
        html += '<h3>Physical Disks</h3>';
        if (data.disks) {
            for(var i=0; i<data.disks.length; i++) {
                var disk = data.disks[i];
                html += '<div class="dm-disk-container">';
                html += '<div class="dm-disk-info">';
                html += '<strong>Disk ' + disk.Number + '</strong><br>';
                html += '<span>' + (disk.PartitionStyle || 'Unknown') + '</span><br>';
                html += '<span>' + pluginHandler.diskmanagement.formatBytes(disk.TotalSize) + '</span><br>';
                html += '<span>' + (disk.OperationalStatus || 'Online') + '</span>';
                html += '</div>';
                
                html += '<div class="dm-disk-parts">';
                if (data.partitions) {
                    for(var p=0; p<data.partitions.length; p++) {
                        var part = data.partitions[p];
                        if (part.DiskNumber === disk.Number) {
                            var pLetter = part.DriveLetter ? (part.DriveLetter + ':\\') : '';
                            var pLabel = '';
                            var pFs = '';
                            if (pLetter && data.volumes) {
                                for(var v=0; v<data.volumes.length; v++) {
                                    if (data.volumes[v].DriveLetter === part.DriveLetter) {
                                        pLabel = data.volumes[v].FileSystemLabel || '';
                                        pFs = data.volumes[v].FileSystem || '';
                                    }
                                }
                            }
                            var flexGrow = disk.TotalSize > 0 ? (part.Size / disk.TotalSize) : 1;
                            
                            html += '<div class="dm-part" style="flex-grow: '+flexGrow+';">';
                            if (pLetter) html += '<strong>'+(pLabel ? pLabel + ' ' : '')+'('+pLetter+')</strong><br>';
                            else html += '<strong>'+(part.Type||'Partition')+'</strong><br>';
                            html += '<span>'+pluginHandler.diskmanagement.formatBytes(part.Size)+' '+(pFs ? pFs : '')+'</span><br>';
                            html += '<span>'+(part.Type||'Healthy')+'</span>';
                            html += '</div>';
                        }
                    }
                }
                html += '</div>';
                
                html += '</div>';
            }
        }
        
        QH('pluginDiskManagement', html);
    };

    obj.formatBytes = function(bytes, decimals) {
        if (!+bytes) return '0 Bytes';
        decimals = decimals || 2;
        var k = 1024;
        var dm = decimals < 0 ? 0 : decimals;
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return obj;
};
