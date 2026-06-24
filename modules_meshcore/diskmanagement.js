"use strict";

var debug_flag = true;

var dbg = function(str) {
    if (debug_flag !== true) return;
    try {
        var fs = require('fs');
        var logStream = fs.createWriteStream('dm_debug.txt', {'flags': 'a'});
        logStream.write('\n'+new Date().toLocaleString()+': '+ str);
        logStream.end();
    } catch (e) {}
};

function runPowerShell(command, callback) {
    var Xerr = null;
    var Xstdout = null;
    var Xstderr = null;
    var child = require('child_process').execFile(
        process.env['windir'] + '\\system32\\WindowsPowerShell\\v1.0\\powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
        { cwd: process.env['TEMP'] },
        function(err, stdout, stderr) {
            Xerr = err;
            Xstdout = stdout;
            Xstderr = stderr;
        }
    );
    child.stdout.str = '';
    child.stdout.on('data', function (chunk) { this.str += chunk.toString(); });
    child.waitExit();

    Xstdout = child.stdout.str.trim();
    dbg("runPowerShell complete. err=" + Xerr);
    callback(Xerr, Xstdout, Xstderr);
}

function consoleaction(args, rights, sessionid, parent) {
    try {
        dbg('consoleaction started');
        if (process.platform != 'win32') return;
        
        var fnname = null;
        if (typeof args['_'] != 'undefined') {
            fnname = args['_'][1];
        } else if (args.pluginaction) {
            fnname = args.pluginaction;
        }

        if (fnname == null) {
            return;
        }

        var currentSessionid = args.sessionid || sessionid;
        var mesh = parent;
        dbg('fnname is ' + fnname);
        
        switch (fnname) {
            case 'getdisks': {
                var psScript = "$disks = Get-Disk | Select-Object Number, PartitionStyle, TotalSize, OperationalStatus; " +
                               "$partitions = Get-Partition | Select-Object DiskNumber, PartitionNumber, DriveLetter, Type, Size; " +
                               "$volumes = Get-Volume | Select-Object DriveLetter, FileSystemLabel, FileSystem, HealthStatus, Size, SizeRemaining; " +
                               "@{ disks = @($disks); partitions = @($partitions); volumes = @($volumes) } | ConvertTo-Json -Depth 4 -Compress";
                
                runPowerShell(psScript, function(err, stdout, stderr) {
                    var parsed = null;
                    if (stdout) {
                        if (stdout.length > 0 && stdout.charCodeAt(0) === 0xFEFF) stdout = stdout.substring(1);
                        try {
                            parsed = JSON.parse(stdout);
                        } catch(e) {
                            dbg('Parse error: ' + e.message);
                        }
                    }
                    
                    if (parsed) {
                        dbg('Sending success response');
                        mesh.SendCommand({
                            action: 'plugin',
                            plugin: 'diskmanagement',
                            pluginaction: 'getdisksResult',
                            data: parsed,
                            error: null,
                            sessionid: currentSessionid
                        });
                    } else {
                        dbg('Sending error response');
                        mesh.SendCommand({
                            action: 'plugin',
                            plugin: 'diskmanagement',
                            pluginaction: 'getdisksResult',
                            data: null,
                            error: 'Failed to parse output. Stderr: ' + stderr + ' err: ' + err,
                            sessionid: currentSessionid
                        });
                    }
                });
                break;
            }
        }
    } catch (globalEx) {
        dbg('GLOBAL EXCEPTION: ' + globalEx.toString());
    }
}

module.exports = { consoleaction : consoleaction };
