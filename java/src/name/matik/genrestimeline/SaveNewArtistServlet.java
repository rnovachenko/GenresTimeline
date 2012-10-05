package name.matik.genrestimeline;

import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.Charset;
import java.util.HashMap;
import java.util.Map;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

import voldemort.client.ClientConfig;
import voldemort.client.SocketStoreClientFactory;
import voldemort.client.StoreClient;
import voldemort.client.StoreClientFactory;

public class SaveNewArtistServlet extends HttpServlet {

	private static final long serialVersionUID = 1L;

	private StoreClient<String, ArtistGenreInfo> client;

	@Override
	public void init() throws ServletException {
		super.init();

		String bootstrapUrl = "tcp://localhost:6666";
		StoreClientFactory factory = new SocketStoreClientFactory(new ClientConfig().setBootstrapUrls(bootstrapUrl));
		client = factory.getStoreClient("test");
	}

	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		OutputStreamWriter writer = new OutputStreamWriter(response.getOutputStream(), Charset.forName("UTF-8"));
		String artist = request.getParameter("name");
		if (request.getParameterMap().containsKey("broken")) {
			client.put(artist, new ArtistGenreInfo(artist, new HashMap<String, Integer>(), true));
		} else {
			String tagsString = request.getParameter("tags");
			try {
				JSONObject tagsJson = (JSONObject) new JSONParser().parse(tagsString);
				Map<String, Integer> tagWeights = new HashMap<String, Integer>();
				for (Object tag : tagsJson.keySet()) {
					tagWeights.put((String) tag, Integer.valueOf((String) tagsJson.get(tag)));
				}

				ArtistGenreInfo value = new ArtistGenreInfo(artist, tagWeights, false);
				writer.append(value.toString());
				client.put(artist, value);
			} catch (ParseException e) {
				throw new ServletException(e);
			}
		}
		writer.flush();
	}

}
