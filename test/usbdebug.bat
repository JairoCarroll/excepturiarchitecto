start "" "C:\Program Files\Wireshark\wireshark" -i USBPcap2 -k -Y "(usb.endpoint_address.number == 2) && (usb.capdata)"