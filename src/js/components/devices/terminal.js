import React, { useState } from 'react';
import { connect } from 'react-redux';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core';

import { XTerm } from 'xterm-for-react';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import msgpack5 from 'msgpack5';

import { setSnackbar } from '../../actions/appActions';

// see https://github.com/mendersoftware/go-lib-micro/tree/master/ws
//     for the description of proto_header and the consts
// *Note*: this needs to be aligned with mender-connect and deviceconnect.
const MessageProtocolShell = 1;

const MessageTypeNew = 'new';
const MessageTypePing = 'ping';
const MessageTypePong = 'pong';
const MessageTypeResize = 'resize';
const MessageTypeShell = 'shell';
const MessageTypeDelay = 'delay';
const MessageTypeStop = 'stop';

const MessagePack = msgpack5();

const byteArrayToString = body => {
  var myString = '';
  for (var i = 0; i < body.byteLength; i++) {
    myString += String.fromCharCode(body[i]);
  }
  return myString;
};

const blobToString = blob => {
  return new Promise(resolve => {
    let fr = new FileReader();
    fr.onload = () => {
      resolve(fr.result);
    };
    fr.readAsArrayBuffer(blob);
  });
};

export const Terminal = props => {
  const { deviceId, playback, sessionId, socket, setSessionId, setSocket, setSnackbar, onCancel } = props;
  const xtermRef = React.useRef(null);

  const onData = data => {
    const proto_header = { proto: MessageProtocolShell, typ: MessageTypeShell, sid: sessionId, props: null };
    const msg = { hdr: proto_header, body: data };

    const encodedData = MessagePack.encode(msg);
    socket.send(encodedData);
  };

  React.useEffect(() => {
    const term = xtermRef.current.terminal;

    try {
      fitAddon.fit();
    } catch {
      setSnackbar('Fit not possible, terminal not yet visible', 5000);
    }

    var resizeInterval = null;
    console.log('the playback: ' + playback);
    var socket;

    if (playback) {
      socket = new WebSocket('wss://' + window.location.host + '/api/management/v1/deviceconnect/sessions/630d4a06-6264-4031-93bb-ca085270a687/playback');
    } else {
      socket = new WebSocket('wss://' + window.location.host + '/api/management/v1/deviceconnect/devices/' + deviceId + '/connect');
    }
    // const { createGroupExplanation, fromFilters, modifyGroupDialog, removeGroup, tmpDevices } = self.state;
    socket.onopen = () => {
      setSnackbar('Connection with the device established.' + deviceId, 5000);
      //
      fitAddon.fit();
      var dimensions = fitAddon.proposeDimensions();
      //
      const proto_header = {
        proto: MessageProtocolShell,
        typ: MessageTypeNew,
        sid: null,
        props: { 'terminal_height': dimensions.rows, 'terminal_width': dimensions.cols }
      };
      const msg = { hdr: proto_header };
      const encodedData = MessagePack.encode(msg);
      socket.send(encodedData);
      term.focus();
      //
      resizeInterval = setInterval(function () {
        fitAddon.fit();
        const newDimensions = fitAddon.proposeDimensions();
        if (newDimensions.rows != dimensions.rows || newDimensions.cols != dimensions.cols) {
          dimensions = newDimensions;
          //
          const proto_header = {
            proto: MessageProtocolShell,
            typ: MessageTypeResize,
            sid: sessionId,
            props: { 'terminal_height': dimensions.rows, 'terminal_width': dimensions.cols }
          };
          const msg = { hdr: proto_header };
          const encodedData = MessagePack.encode(msg);
          socket.send(encodedData);
        }
      }, 1000);
    };

    var snackbarAlreadySet = false;
    var healthcheckHasFailed = false;
    var frame = 0;

    socket.onclose = event => {
      console.log('onclose');
      if (!snackbarAlreadySet && healthcheckHasFailed) {
        setSnackbar('Health check failed: connection with the device lost.', 5000);
      } else if (!snackbarAlreadySet && event.wasClean) {
        setSnackbar(`Connection with the device closed.`, 5000);
      } else {
        if (!snackbarAlreadySet) {
          setSnackbar('Connection with the device died.', 5000);
        }
        let timer = setTimeout(() => {
          onCancel();
        }, 15000 + 1000 * frame);
        console.log(timer);
      }
      //
      if (resizeInterval) {
        clearInterval(resizeInterval);
        resizeInterval = null;
      }
    };

    socket.onerror = error => {
      setSnackbar('WebSocket error: ' + error.message, 5000);
      onCancel();
    };

    const healthcheckFailed = () => {
      healthcheckHasFailed = true;
      socket.close();
      onCancel();
      console.log('healthcheckHasFailed');
    };

    var healthcheckTimeout = null;
    var buffer = [];
    var buffer_index = 0;
    var keystroke_delay = 0;
    var last_timeout = 0;
    socket.onmessage = event => {
      blobToString(event.data).then(function (data) {
        const obj = MessagePack.decode(data);
        if (obj.hdr.proto === MessageProtocolShell) {
          if (obj.hdr.typ === MessageTypeNew) {
            if ((obj.hdr.props || {}).status == 2) {
              setSnackbar('Error: ' + byteArrayToString(obj.body), 5000);
              snackbarAlreadySet = true;
              socket.close();
              onCancel();
            } else {
              setSessionId(obj.hdr.sid);
            }
          } else if (obj.hdr.typ === MessageTypeDelay) {
            // keystroke_delay = obj.hdr.props['delay_value'];
            keystroke_delay = obj.hdr.props.delay_value;
          } else if (obj.hdr.typ === MessageTypeShell) {
            if (!playback) {
              term.write(byteArrayToString(obj.body));
            } else {
              frame++;
              buffer.push(obj.body);
              last_timeout += 500;
              if (keystroke_delay > 0) {
                last_timeout += keystroke_delay;
              }
              let timer = setTimeout(() => {
                term.write(byteArrayToString(buffer[buffer_index]));
                console.log('buffer_index: ' + buffer_index);
                buffer_index++;
              }, last_timeout);
              console.log(timer);
              console.log('frame: ' + frame);
            }
            // new Promise(resolve => setTimeout(resolve, 1200)).then(() => {
            //   console.log('write');
            //   term.write(byteArrayToString(obj.body));
            // });
          } else if (obj.hdr.typ === MessageTypeStop) {
            frame++;
            socket.close();
            let timer = setTimeout(() => {
              onCancel();
            }, 3000 + 1000 * frame + 3000);
            console.log(timer);
            console.log('closed.');
          } else if (obj.hdr.typ == MessageTypePing) {
            if (healthcheckTimeout) {
              clearTimeout(healthcheckTimeout);
            }
            const proto_header = { proto: 1, typ: MessageTypePong, sid: sessionId, props: null };
            const msg = { hdr: proto_header, body: null };
            const encodedData = MessagePack.encode(msg);
            socket.send(encodedData);
            //
            var timeout = parseInt((obj.hdr.props || {}).timeout);
            if (timeout > 0) {
              healthcheckTimeout = setTimeout(healthcheckFailed, timeout * 1000);
            }
          }
        }
      });
    };

    setSocket(socket);

    return () => {
      if (resizeInterval) {
        clearInterval(resizeInterval);
        resizeInterval = null;
      }
    };
  }, []);

  const options = {
    cursorBlink: 'block',
    macOptionIsMeta: true,
    scrollback: 100
  };

  const fitAddon = new FitAddon();
  const searchAddon = new SearchAddon();

  return <XTerm ref={xtermRef} addons={[fitAddon, searchAddon]} options={options} onData={onData} className="xterm-fullscreen" />;
};

const actionCreators = { setSnackbar };

const mapStateToProps = () => {
  return {};
};

export const TerminalDialog = props => {
  const [socket, setSocket] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const { open, onCancel, deviceId, playback, setSnackbar } = props;

  const onClose = () => {
    const proto_header = { proto: 1, typ: MessageTypeStop, sid: sessionId, props: null };
    const msg = { hdr: proto_header, body: null };
    const encodedData = MessagePack.encode(msg);
    socket.send(encodedData);
    setSocket(null);
    onCancel();
  };

  return (
    <Dialog open={open} fullWidth={true} maxWidth="lg">
      <DialogTitle>Terminal</DialogTitle>
      <DialogContent className="dialog-content" style={{ padding: 0, margin: '0 24px', height: '75vh' }}>
        <Terminal
          deviceId={deviceId}
          playback={playback}
          sessionId={sessionId}
          socket={socket}
          setSessionId={setSessionId}
          setSocket={setSocket}
          setSnackbar={setSnackbar}
          onCancel={onCancel}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default connect(mapStateToProps, actionCreators)(TerminalDialog);
