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
            var fs = require('fs');
            try { fs.writeFileSync('dm.txt', 'started getdisks\n'); } catch(e) {}
            
            var psScript = "$disks = Get-Disk | Select-Object Number, PartitionStyle, TotalSize, OperationalStatus; " +
                           "$partitions = Get-Partition | Select-Object DiskNumber, PartitionNumber, DriveLetter, Type, Size; " +
                           "$volumes = Get-Volume | Select-Object DriveLetter, FileSystemLabel, FileSystem, HealthStatus, Size, SizeRemaining; " +
                           "@{ disks = @($disks); partitions = @($partitions); volumes = @($volumes) } | ConvertTo-Json -Depth 4 -Compress";
            
            try { fs.appendFileSync('dm.txt', 'script: ' + psScript + '\n'); } catch(e) {}
            
            var child = require('child_process').execFile(
                process.env['windir'] + '\\system32\\WindowsPowerShell\\v1.0\\powershell.exe',
                ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
                { cwd: process.env['TEMP'] }
            );
            
            child.stdout.str = '';
            child.stdout.on('data', function (chunk) { this.str += chunk.toString(); });
            
            var errstr = '';
            child.stderr.on('data', function (chunk) { errstr += chunk.toString(); });
            
            try { fs.appendFileSync('dm.txt', 'child process started\n'); } catch(e) {}
            
            child.on('exit', function (code) {
                try {
                    try { fs.appendFileSync('dm.txt', 'child process exited with code ' + code + '\n'); } catch(e) {}
                    var out = child.stdout.str;
                    try { fs.appendFileSync('dm.txt', 'stdout length: ' + (out ? out.length : 0) + '\n'); } catch(e) {}
                    try { fs.appendFileSync('dm.txt', 'stderr: ' + errstr + '\n'); } catch(e) {}
                    
                    if (out && out.length > 0 && out.charCodeAt(0) === 0xFEFF) out = out.substring(1);
                    if (out) {
                        try { out = out.trim(); } catch (e) { }
                        try { fs.appendFileSync('dm.txt', 'parsing json...\n'); } catch(e) {}
                        var response = { type: 'disks', data: JSON.parse(out) };
                        try { fs.appendFileSync('dm.txt', 'parsed json, sending response... isWs: ' + isWsconnection + '\n'); } catch(e) {}
                        
                        if (isWsconnection) {
                            wscon.write(new Buffer(JSON.stringify(response)));
                        } else {
                            mesh.SendCommand({ "action": "msg", "type": "console", "value": JSON.stringify(response), "sessionid": sessionid });
                        }
                        try { fs.appendFileSync('dm.txt', 'sent successfully\n'); } catch(e) {}
                    } else {
                        try { fs.appendFileSync('dm.txt', 'no output\n'); } catch(e) {}
                        if (isWsconnection) {
                            wscon.write(new Buffer(JSON.stringify({type: 'error', message: 'No disk data returned by PowerShell. Stderr: ' + errstr})));
                        }
                    }
                } catch (e) {
                    try { fs.appendFileSync('dm.txt', 'error: ' + e.toString() + '\n'); } catch(err) {}
                    if (isWsconnection) {
                        wscon.write(new Buffer(JSON.stringify({type: 'error', message: e.toString() + ' Stderr: ' + errstr})));
                    }
                }
            });
            break;
        }
    }
}

module.exports = { consoleaction : consoleaction };
