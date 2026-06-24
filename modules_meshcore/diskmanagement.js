"use strict";
var mesh;
var isWsconnection = false;
var wscon = null;

function consoleaction(args, rights, sessionid, parent) {
    isWsconnection = false;
    wscon = parent;
    
    if (typeof args['_'] == 'undefined') {
        args['_'] = [];
        args['_'][1] = args.pluginaction;
        isWsconnection = true;
    }
    
    if (process.platform != 'win32') {
        if (isWsconnection) {
            parent.write(Buffer.from(JSON.stringify({type: "close"})));
        }
        return "Disk management is only available on Windows endpoints.";
    }
    
    var fnname = args['_'][1];
    mesh = parent;
    
    switch (fnname) {
        case 'getdisks': {
            var fileRand = Math.random().toString(32).replace('0.', '');
            var pName = 'dmscript' + fileRand + '.ps1';
            var oName = 'dmout' + fileRand + '.txt';
            
            var psScript = "$disks = Get-Disk | Select-Object Number, PartitionStyle, TotalSize, OperationalStatus; " +
                           "$partitions = Get-Partition | Select-Object DiskNumber, PartitionNumber, DriveLetter, Type, Size; " +
                           "$volumes = Get-Volume | Select-Object DriveLetter, FileSystemLabel, FileSystem, HealthStatus, Size, SizeRemaining; " +
                           "@{ disks = @($disks); partitions = @($partitions); volumes = @($volumes) } | ConvertTo-Json -Depth 4 -Compress | Out-File " + oName + " -Encoding UTF8";
            
            var fs = require('fs');
            try { fs.writeFileSync(pName, psScript); } catch(e) {}

            var child = require('child_process').execFile(process.env['windir'] + '\\system32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', pName]);
            var errstr = '';
            child.stderr.on('data', function (chunk) { errstr += chunk; });
            
            child.on('exit', function (code) {
                try {
                    var out = fs.readFileSync(oName, 'utf8').toString();
                    if (out.charCodeAt(0) === 0xFEFF) out = out.substring(1);
                    if (out) {
                        try { out = out.trim(); } catch (e) { }
                        var response = { type: 'disks', data: JSON.parse(out) };
                        if (isWsconnection) {
                            wscon.write(Buffer.from(JSON.stringify(response)));
                        } else {
                            mesh.SendCommand({ "action": "msg", "type": "console", "value": JSON.stringify(response), "sessionid": sessionid });
                        }
                    } else {
                        if (isWsconnection) {
                            wscon.write(Buffer.from(JSON.stringify({type: 'error', message: 'No disk data returned by PowerShell. Stderr: ' + errstr})));
                        }
                    }
                    try { fs.unlinkSync(oName); } catch (e) {}
                    try { fs.unlinkSync(pName); } catch (e) {}
                } catch (e) {
                    if (isWsconnection) {
                        wscon.write(Buffer.from(JSON.stringify({type: 'error', message: e.toString() + ' Stderr: ' + errstr})));
                    }
                    try { fs.unlinkSync(pName); } catch (e) {}
                }
            });
            break;
        }
    }
}

module.exports = { consoleaction : consoleaction };
